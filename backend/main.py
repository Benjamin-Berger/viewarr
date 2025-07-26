from fastapi import FastAPI, HTTPException, Request, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
import mimetypes
from pathlib import Path
from typing import List, Dict, Any
import magic
import subprocess
import tempfile
import base64
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json

app = FastAPI(title="Photo Viewer API", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    """Start the thumbnail queue processor on app startup."""
    asyncio.create_task(process_thumbnail_queue())

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

# Thumbnail cache and processing state
thumbnail_cache = {}
thumbnail_processing = set()
thumbnail_queue = asyncio.Queue()
executor = ThreadPoolExecutor(max_workers=2)  # Reduce concurrent workers to prevent blocking
MAX_CONCURRENT_THUMBNAILS = 2  # Limit concurrent thumbnail generation

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

def generate_video_thumbnail_sync(video_path: Path) -> str:
    """Generate a base64 thumbnail for a video file (synchronous version for background tasks)."""
    try:
        # Create a temporary file for the thumbnail
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            temp_thumbnail_path = temp_file.name
        
        # Try 5 seconds first, then fallback to 1 second, then 0.1 seconds
        for seek_time in ['00:00:05', '00:00:01', '00:00:00.1']:
            # Use ffmpeg to generate thumbnail at specified time with low resolution
            cmd = [
                'ffmpeg', '-i', str(video_path), '-ss', seek_time, 
                '-vframes', '1', '-vf', 'scale=150:-1', '-y', temp_thumbnail_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
            
            if result.returncode == 0 and os.path.exists(temp_thumbnail_path):
                # Check if the thumbnail file has content
                if os.path.getsize(temp_thumbnail_path) > 0:
                    # Read the thumbnail and convert to base64
                    with open(temp_thumbnail_path, 'rb') as f:
                        thumbnail_data = f.read()
                    
                    # Clean up temporary file
                    os.unlink(temp_thumbnail_path)
                    
                    # Return base64 encoded thumbnail
                    return f"data:image/jpeg;base64,{base64.b64encode(thumbnail_data).decode()}"
                else:
                    # Empty file, try next seek time
                    os.unlink(temp_thumbnail_path)
            else:
                # Log the error for debugging
                print(f"FFmpeg error for {video_path} at {seek_time}: {result.stderr}")
                # Clean up if file exists
                if os.path.exists(temp_thumbnail_path):
                    os.unlink(temp_thumbnail_path)
        
        # If both attempts failed, return None
        return None
    except Exception as e:
        print(f"Error generating thumbnail for {video_path}: {e}")
        return None

def generate_video_thumbnail(video_path: Path) -> str:
    """Generate a base64 thumbnail for a video file (legacy synchronous version)."""
    return generate_video_thumbnail_sync(video_path)

def get_thumbnail_cache_key(file_path: str) -> str:
    """Generate a cache key for thumbnails based on file path and modification time."""
    full_path = Path(PHOTOS_DIR) / file_path
    if full_path.exists():
        # Include file modification time in cache key to invalidate when file changes
        mtime = full_path.stat().st_mtime
        return hashlib.md5(f"{file_path}:{mtime}".encode()).hexdigest()
    return hashlib.md5(file_path.encode()).hexdigest()

async def generate_thumbnail_background(file_path: str):
    """Background task to generate thumbnail asynchronously."""
    try:
        # URL decode the file path
        from urllib.parse import unquote
        decoded_file_path = unquote(file_path)
        full_path = Path(PHOTOS_DIR) / decoded_file_path
        
        if not full_path.exists() or not full_path.is_file():
            return
        
        # Only generate thumbnails for video files
        if full_path.suffix.lower() not in VIDEO_EXTENSIONS:
            return
        
        # Generate thumbnail
        thumbnail_data = generate_video_thumbnail_sync(full_path)
        
        if thumbnail_data:
            cache_key = get_thumbnail_cache_key(file_path)
            thumbnail_cache[cache_key] = thumbnail_data
            print(f"Generated thumbnail for {file_path}")
        else:
            print(f"Failed to generate thumbnail for {file_path}")
            
    except Exception as e:
        print(f"Error in background thumbnail generation for {file_path}: {e}")
    finally:
        # Remove from processing set
        thumbnail_processing.discard(file_path)

async def process_thumbnail_queue():
    """Process thumbnail generation queue in the background."""
    while True:
        try:
            # Get next item from queue
            file_path = await thumbnail_queue.get()
            
            # Check if we're already processing this file
            if file_path in thumbnail_processing:
                thumbnail_queue.task_done()
                continue
            
            # Check if we have too many concurrent thumbnails
            if len(thumbnail_processing) >= MAX_CONCURRENT_THUMBNAILS:
                # Put it back in the queue for later
                await thumbnail_queue.put(file_path)
                await asyncio.sleep(1)  # Wait a bit before trying again
                continue
            
            # Start processing
            thumbnail_processing.add(file_path)
            
            # Run thumbnail generation in thread pool
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(executor, generate_thumbnail_background_sync, file_path)
            
            # Mark task as done
            thumbnail_queue.task_done()
            
        except Exception as e:
            print(f"Error in thumbnail queue processor: {e}")
            await asyncio.sleep(1)

def generate_thumbnail_background_sync(file_path: str):
    """Synchronous version of background thumbnail generation for thread pool."""
    try:
        # URL decode the file path
        from urllib.parse import unquote
        decoded_file_path = unquote(file_path)
        full_path = Path(PHOTOS_DIR) / decoded_file_path
        
        if not full_path.exists() or not full_path.is_file():
            return
        
        # Only generate thumbnails for video files
        if full_path.suffix.lower() not in VIDEO_EXTENSIONS:
            return
        
        # Generate thumbnail
        thumbnail_data = generate_video_thumbnail_sync(full_path)
        
        if thumbnail_data:
            cache_key = get_thumbnail_cache_key(file_path)
            thumbnail_cache[cache_key] = thumbnail_data
            print(f"Generated thumbnail for {file_path}")
        else:
            print(f"Failed to generate thumbnail for {file_path}")
            
    except Exception as e:
        print(f"Error in background thumbnail generation for {file_path}: {e}")
    finally:
        # Remove from processing set
        thumbnail_processing.discard(file_path)

def submit_thumbnail_generation(file_path: str, background_tasks: BackgroundTasks):
    """Submit thumbnail generation to queue if not already processing."""
    if file_path not in thumbnail_processing:
        # Add to queue instead of directly starting
        asyncio.create_task(thumbnail_queue.put(file_path))

@app.get("/")
async def root():
    return {"message": "Photo Viewer API", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify the API is running."""
    return {
        "status": "healthy",
        "ffmpeg_available": subprocess.run(['which', 'ffmpeg'], capture_output=True).returncode == 0,
        "photos_dir": PHOTOS_DIR,
        "photos_dir_exists": os.path.exists(PHOTOS_DIR),
        "thumbnail_queue_size": thumbnail_queue.qsize(),
        "thumbnail_processing_count": len(thumbnail_processing),
        "thumbnail_cache_size": len(thumbnail_cache)
    }

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
        # URL decode the folder path
        from urllib.parse import unquote
        decoded_folder_path = unquote(folder_path)
        folder_full_path = Path(PHOTOS_DIR) / decoded_folder_path
        
        if not folder_full_path.exists() or not folder_full_path.is_dir():
            raise HTTPException(status_code=404, detail="Folder not found")
        
        subfolders = []
        for item in folder_full_path.iterdir():
            try:
                if item.is_dir():
                    # Count files in subfolder (with error handling)
                    file_count = 0
                    subfolder_count = 0
                    try:
                        for f in item.iterdir():
                            try:
                                if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS:
                                    file_count += 1
                                elif f.is_dir():
                                    subfolder_count += 1
                            except (OSError, PermissionError):
                                # Skip files we can't access
                                continue
                    except (OSError, PermissionError):
                        # Skip directories we can't access
                        continue
                    
                    subfolders.append({
                        "name": item.name,
                        "path": str(item.relative_to(Path(PHOTOS_DIR))),
                        "file_count": file_count,
                        "has_subfolders": subfolder_count > 0
                    })
            except (OSError, PermissionError):
                # Skip items we can't access
                continue
        
        return sorted(subfolders, key=lambda x: x["name"].lower())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing subfolders: {str(e)}")

@app.get("/api/thumbnail/{file_path:path}")
async def get_video_thumbnail(file_path: str, background_tasks: BackgroundTasks):
    """Generate and serve a thumbnail for a video file with caching and background processing."""
    try:
        # URL decode the file path
        from urllib.parse import unquote
        decoded_file_path = unquote(file_path)
        full_path = Path(PHOTOS_DIR) / decoded_file_path
        
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Security check: ensure file is within photos directory
        try:
            full_path.resolve().relative_to(Path(PHOTOS_DIR).resolve())
        except ValueError:
            if not str(full_path).startswith(str(Path(PHOTOS_DIR))):
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Only generate thumbnails for video files
        if full_path.suffix.lower() not in VIDEO_EXTENSIONS:
            raise HTTPException(status_code=400, detail="File is not a video")
        
        # Check cache first
        cache_key = get_thumbnail_cache_key(file_path)
        if cache_key in thumbnail_cache:
            return {"thumbnail": thumbnail_cache[cache_key], "cached": True}
        
        # If not in cache and not currently processing, submit to queue
        if file_path not in thumbnail_processing:
            submit_thumbnail_generation(file_path, background_tasks)
            return {"status": "queued", "message": "Thumbnail generation queued"}
        
        # If currently processing, return processing status
        return {"status": "processing", "message": "Thumbnail is being generated"}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating thumbnail: {str(e)}")

@app.get("/api/thumbnail-status/{file_path:path}")
async def get_thumbnail_status(file_path: str):
    """Check the status of thumbnail generation for a file."""
    try:
        # URL decode the file path
        from urllib.parse import unquote
        decoded_file_path = unquote(file_path)
        full_path = Path(PHOTOS_DIR) / decoded_file_path
        
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check cache
        cache_key = get_thumbnail_cache_key(file_path)
        if cache_key in thumbnail_cache:
            return {"status": "ready", "thumbnail": thumbnail_cache[cache_key]}
        
        # Check if processing
        if file_path in thumbnail_processing:
            return {"status": "processing"}
        
        # Not in cache and not processing
        return {"status": "not_started"}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking thumbnail status: {str(e)}")

@app.post("/api/thumbnail-cache/clear")
async def clear_thumbnail_cache():
    """Clear the thumbnail cache."""
    global thumbnail_cache, thumbnail_processing
    cache_size = len(thumbnail_cache)
    processing_count = len(thumbnail_processing)
    
    thumbnail_cache.clear()
    thumbnail_processing.clear()
    
    return {
        "message": "Thumbnail cache cleared",
        "cleared_cache_entries": cache_size,
        "cleared_processing_entries": processing_count
    }

@app.get("/api/thumbnail-cache/status")
async def get_thumbnail_cache_status():
    """Get the current status of the thumbnail cache."""
    return {
        "cache_size": len(thumbnail_cache),
        "processing_count": len(thumbnail_processing),
        "queue_size": thumbnail_queue.qsize(),
        "max_concurrent": MAX_CONCURRENT_THUMBNAILS,
        "cache_keys": list(thumbnail_cache.keys())[:10],  # Show first 10 keys
        "processing_files": list(thumbnail_processing)[:10]  # Show first 10 processing files
    }

@app.get("/api/photos/{folder_path:path}")
async def get_photos(folder_path: str) -> Dict[str, Any]:
    """Get all photos in a specific folder."""
    try:
        # URL decode the folder path
        from urllib.parse import unquote
        decoded_folder_path = unquote(folder_path)
        folder_full_path = Path(PHOTOS_DIR) / decoded_folder_path
        # Try to access the directory directly, even if exists() returns False
        try:
            # Try to list the directory contents
            list(folder_full_path.iterdir())
        except (OSError, PermissionError, FileNotFoundError):
            raise HTTPException(status_code=404, detail="Folder not found")
        
        photos = []
        for file_path in folder_full_path.iterdir():
            try:
                if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
                    try:
                        file_type = get_file_type(file_path)
                        if file_type != "unknown":
                            photo_data = {
                                "name": file_path.name,
                                "path": str(file_path.relative_to(Path(PHOTOS_DIR))),
                                "type": file_type,
                                "size": file_path.stat().st_size,
                                "modified": file_path.stat().st_mtime
                            }
                            
                            # Add thumbnail info for videos
                            if file_type == "video":
                                photo_data["has_thumbnail"] = True
                            
                            photos.append(photo_data)
                    except (OSError, PermissionError):
                        # Skip files we can't access
                        continue
            except (OSError, PermissionError):
                # Skip items we can't access
                continue
        
        return {
            "folder": folder_path,
            "photos": sorted(photos, key=lambda x: x["name"].lower())
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting photos: {str(e)}")

@app.get("/api/photo/{file_path:path}")
async def serve_photo(file_path: str, request: Request):
    """Serve a specific photo or video file, with HTTP Range support for videos."""
    try:
        # URL decode the file path
        from urllib.parse import unquote
        decoded_file_path = unquote(file_path)
        full_path = Path(PHOTOS_DIR) / decoded_file_path
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        # Security check: ensure file is within photos directory
        try:
            # Try the resolve method first
            full_path.resolve().relative_to(Path(PHOTOS_DIR).resolve())
        except ValueError:
            # If that fails, try a simpler check for mounted volumes
            try:
                # Check if the file path starts with the photos directory
                if not str(full_path).startswith(str(Path(PHOTOS_DIR))):
                    raise HTTPException(status_code=403, detail="Access denied")
            except Exception:
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