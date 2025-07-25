from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
import mimetypes
from pathlib import Path
from typing import List, Dict, Any
import magic

app = FastAPI(title="Photo Viewer API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Photo directory from environment variable
PHOTOS_DIR = os.getenv("PHOTOS_DIR", "/photos")

# Supported file extensions
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'}
VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'}
SUPPORTED_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS

def get_file_type(file_path: Path) -> str:
    """Determine if file is image or video based on extension and magic bytes."""
    ext = file_path.suffix.lower()
    
    if ext in IMAGE_EXTENSIONS:
        return "image"
    elif ext in VIDEO_EXTENSIONS:
        return "video"
    else:
        # Fallback to magic bytes for unknown extensions
        try:
            mime = magic.from_file(str(file_path), mime=True)
            if mime.startswith('image/'):
                return "image"
            elif mime.startswith('video/'):
                return "video"
        except:
            pass
    return "unknown"

@app.get("/")
async def root():
    return {"message": "Photo Viewer API", "version": "1.0.0"}

@app.get("/api/folders")
async def list_folders() -> List[Dict[str, Any]]:
    """List all folders in the photos directory."""
    try:
        photos_path = Path(PHOTOS_DIR)
        if not photos_path.exists():
            return []
        
        folders = []
        for item in photos_path.iterdir():
            if item.is_dir():
                # Count files in folder
                file_count = sum(1 for f in item.iterdir() 
                               if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS)
                
                # Check if folder has subfolders
                subfolder_count = sum(1 for f in item.iterdir() if f.is_dir())
                
                folders.append({
                    "name": item.name,
                    "path": str(item.relative_to(photos_path)),
                    "file_count": file_count,
                    "has_subfolders": subfolder_count > 0
                })
        
        return sorted(folders, key=lambda x: x["name"].lower())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing folders: {str(e)}")

@app.get("/api/subfolders/{folder_path:path}")
async def list_subfolders(folder_path: str) -> List[Dict[str, Any]]:
    """List subfolders within a specific folder."""
    try:
        folder_full_path = Path(PHOTOS_DIR) / folder_path
        
        if not folder_full_path.exists() or not folder_full_path.is_dir():
            raise HTTPException(status_code=404, detail="Folder not found")
        
        subfolders = []
        for item in folder_full_path.iterdir():
            if item.is_dir():
                # Count files in subfolder
                file_count = sum(1 for f in item.iterdir() 
                               if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS)
                
                # Check if subfolder has its own subfolders
                subfolder_count = sum(1 for f in item.iterdir() if f.is_dir())
                
                subfolders.append({
                    "name": item.name,
                    "path": str(item.relative_to(Path(PHOTOS_DIR))),
                    "file_count": file_count,
                    "has_subfolders": subfolder_count > 0
                })
        
        return sorted(subfolders, key=lambda x: x["name"].lower())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing subfolders: {str(e)}")

@app.get("/api/photos/{folder_path:path}")
async def get_photos(folder_path: str) -> Dict[str, Any]:
    """Get all photos in a specific folder."""
    try:
        folder_full_path = Path(PHOTOS_DIR) / folder_path
        
        if not folder_full_path.exists() or not folder_full_path.is_dir():
            raise HTTPException(status_code=404, detail="Folder not found")
        
        photos = []
        for file_path in folder_full_path.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
                file_type = get_file_type(file_path)
                if file_type != "unknown":
                    photos.append({
                        "name": file_path.name,
                        "path": str(file_path.relative_to(Path(PHOTOS_DIR))),
                        "type": file_type,
                        "size": file_path.stat().st_size,
                        "modified": file_path.stat().st_mtime
                    })
        
        return {
            "folder": folder_path,
            "photos": sorted(photos, key=lambda x: x["name"].lower()),
            "total_count": len(photos)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting photos: {str(e)}")

@app.get("/api/photo/{file_path:path}")
async def serve_photo(file_path: str, request: Request):
    """Serve a specific photo or video file, with HTTP Range support for videos."""
    try:
        full_path = Path(PHOTOS_DIR) / file_path
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        # Security check: ensure file is within photos directory
        try:
            full_path.resolve().relative_to(Path(PHOTOS_DIR).resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail="Access denied")
        # Determine content type
        content_type, _ = mimetypes.guess_type(str(full_path))
        if not content_type:
            content_type = "application/octet-stream"
        # If it's a video and Range header is present, handle partial content
        if full_path.suffix.lower() in VIDEO_EXTENSIONS:
            range_header = request.headers.get("range")
            file_size = full_path.stat().st_size
            if range_header:
                # Example: Range: bytes=0-1023
                bytes_range = range_header.replace("bytes=", "").split("-")
                try:
                    start = int(bytes_range[0]) if bytes_range[0] else 0
                    end = int(bytes_range[1]) if len(bytes_range) > 1 and bytes_range[1] else file_size - 1
                except ValueError:
                    start = 0
                    end = file_size - 1
                end = min(end, file_size - 1)
                chunk_size = end - start + 1
                with open(full_path, "rb") as f:
                    f.seek(start)
                    data = f.read(chunk_size)
                headers = {
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(chunk_size),
                    "Content-Type": content_type,
                }
                return Response(data, status_code=206, headers=headers)
        # Fallback: serve whole file
        return FileResponse(
            path=str(full_path),
            media_type=content_type,
            filename=full_path.name
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 