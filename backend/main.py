from fastapi import FastAPI, HTTPException, Request, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse
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
    print("🚀 Starting queue processors...")
    try:
        asyncio.create_task(process_thumbnail_queue())
        print("✅ Thumbnail queue processor started")
    except Exception as e:
        print(f"❌ Error starting thumbnail queue processor: {e}")
    
    try:
        asyncio.create_task(process_conversion_queue())
        print("✅ Conversion queue processor started")
    except Exception as e:
        print(f"❌ Error starting conversion queue processor: {e}")
    
    print("🎯 All queue processors started")

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

# Video formats that need conversion
CONVERTIBLE_VIDEO_EXTENSIONS = {'.avi', '.wmv', '.flv'}

# Thumbnail cache and processing state
thumbnail_cache = {}
thumbnail_processing = set()
thumbnail_queue = asyncio.PriorityQueue()  # Changed to PriorityQueue
thumbnail_executor = ThreadPoolExecutor(max_workers=6)  # Increased from 3 to 6
MAX_CONCURRENT_THUMBNAILS = 6  # Increased from 3 to 6

# Conversion cache and processing state
conversion_cache = {}
conversion_processing = set()
conversion_queue = asyncio.Queue()
conversion_executor = ThreadPoolExecutor(max_workers=1)  # Dedicated pool for conversions
MAX_CONCURRENT_CONVERSIONS = 1  # Only one conversion at a time to prevent resource overload

# Track current folder for thumbnail priority
current_folder = None

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

def needs_conversion(file_path: Path) -> bool:
    """Check if a video file needs conversion for browser playback."""
    return file_path.suffix.lower() in CONVERTIBLE_VIDEO_EXTENSIONS

def get_converted_filename(file_path: Path) -> str:
    """Generate the filename for a converted video."""
    return f"{file_path.stem}_converted.mp4"

def generate_video_thumbnail_sync(video_path: Path) -> str:
    """Generate a base64 thumbnail for a video file (synchronous version for background tasks)."""
    try:
        # Create a temporary file for the thumbnail
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            temp_thumbnail_path = temp_file.name
        
        # Try 1 second first, then fallback to 0.1 seconds (much faster)
        for seek_time in ['00:00:01', '00:00:00.1']:
            # Use ffmpeg to generate thumbnail at specified time with optimized settings
            cmd = [
                'ffmpeg', '-i', str(video_path), '-ss', seek_time, 
                '-vframes', '1', '-vf', 'scale=150:-1', 
                '-preset', 'ultrafast',  # Fastest encoding preset
                '-threads', '0',  # Use all available threads
                '-y', temp_thumbnail_path
            ]
            
            # Reduced timeout to 3 seconds (much faster)
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
            
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
    print("🔄 Thumbnail queue processor started")
    while True:
        try:
            print(f"🔍 Waiting for thumbnail queue item... (queue size: {thumbnail_queue.qsize()})")
            # Get next item from priority queue (priority, file_path)
            priority, file_path = await thumbnail_queue.get()
            print(f"📥 Processing thumbnail: {file_path} (priority: {priority})")
            
            # Check if we're already processing this file
            if file_path in thumbnail_processing:
                print(f"⏭️ Already processing {file_path}, skipping")
                thumbnail_queue.task_done()
                continue
            
            # Check if we have too many concurrent thumbnails
            if len(thumbnail_processing) >= MAX_CONCURRENT_THUMBNAILS:
                print(f"⏳ Too many concurrent thumbnails ({len(thumbnail_processing)}), putting back in queue")
                # Put it back in the queue for later
                await thumbnail_queue.put((priority, file_path))
                await asyncio.sleep(1)  # Wait a bit before trying again
                continue
            
            # Start processing
            thumbnail_processing.add(file_path)
            print(f"🔄 Started processing {file_path}")
            
            try:
                # Run thumbnail generation in dedicated thread pool with timeout
                loop = asyncio.get_event_loop()
                await asyncio.wait_for(
                    loop.run_in_executor(thumbnail_executor, generate_thumbnail_background_sync, file_path),
                    timeout=30.0  # 30 second timeout for the entire operation
                )
                print(f"✅ Completed processing {file_path}")
            except asyncio.TimeoutError:
                print(f"⏰ Timeout processing thumbnail for {file_path}")
            except Exception as e:
                print(f"❌ Error processing thumbnail for {file_path}: {e}")
            finally:
                # Always remove from processing set, even if there was an error
                thumbnail_processing.discard(file_path)
                thumbnail_queue.task_done()
                print(f"🧹 Removed {file_path} from processing set")
            
        except Exception as e:
            print(f"❌ Error in thumbnail queue processor: {e}")
            # Make sure we don't get stuck in an infinite loop
            await asyncio.sleep(1)

async def process_conversion_queue():
    """Process video conversion queue in the background."""
    while True:
        try:
            # Get next item from queue
            file_path = await conversion_queue.get()
            
            # Check if we're already processing this file
            if file_path in conversion_processing:
                conversion_queue.task_done()
                continue
            
            # Check if we have too many concurrent conversions
            if len(conversion_processing) >= MAX_CONCURRENT_CONVERSIONS:
                # Put it back in the queue for later
                await conversion_queue.put(file_path)
                await asyncio.sleep(1)  # Wait a bit before trying again
                continue
            
            # Start processing
            conversion_processing.add(file_path)
            
            # Run conversion in dedicated thread pool
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(conversion_executor, convert_video_background_sync, file_path)
            
            # Mark task as done
            conversion_queue.task_done()
            
        except Exception as e:
            print(f"Error in conversion queue processor: {e}")
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
        # Don't remove from processing set here - the queue processor handles that

def convert_video_background_sync(file_path: str):
    """Synchronous version of background video conversion for thread pool."""
    try:
        # URL decode the file path
        from urllib.parse import unquote
        decoded_file_path = unquote(file_path)
        full_path = Path(PHOTOS_DIR) / decoded_file_path
        
        if not full_path.exists() or not full_path.is_file():
            return
        
        # Check if file needs conversion
        if not needs_conversion(full_path):
            return
        
        # Create persistent conversion directory
        conversion_dir = Path("/tmp/video_conversions")
        conversion_dir.mkdir(exist_ok=True)
        output_path = conversion_dir / get_converted_filename(full_path)
        
        # FFmpeg command for fast conversion
        cmd = [
            'ffmpeg', '-i', str(full_path),
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '32',
            '-threads', '0', '-c:a', 'aac', '-b:a', '32k', '-ac', '1',
            '-f', 'mp4', '-movflags', 'frag_keyframe+empty_moov',
            str(output_path)
        ]
        
        # Run conversion
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)  # 5 minute timeout
        
        if result.returncode == 0 and output_path.exists():
            # Cache the converted file
            cache_key = f"{file_path}_converted"
            conversion_cache[cache_key] = output_path
            print(f"Converted video for {file_path}")
        else:
            print(f"Failed to convert video for {file_path}: {result.stderr}")
            
    except Exception as e:
        print(f"Error in background video conversion for {file_path}: {e}")
    finally:
        # Remove from processing set
        conversion_processing.discard(file_path)

def submit_thumbnail_generation(file_path: str, background_tasks: BackgroundTasks):
    """Submit thumbnail generation to queue if not already processing."""
    if file_path not in thumbnail_processing:
        # Add to queue instead of directly starting
        asyncio.create_task(thumbnail_queue.put(file_path))

def submit_conversion_generation(file_path: str):
    """Submit video conversion to queue if not already processing."""
    if file_path not in conversion_processing:
        # Add to queue instead of directly starting
        asyncio.create_task(conversion_queue.put(file_path))

def set_current_folder(folder_path: str):
    """Set the current folder for thumbnail priority."""
    global current_folder
    old_folder = current_folder
    current_folder = folder_path
    
    # If we're switching to a different folder, clear the queue to prioritize new folder
    if old_folder != folder_path:
        clear_thumbnail_queue()
        print(f"Current folder changed from '{old_folder}' to '{folder_path}' - queue cleared")
    else:
        print(f"Current folder set to: {folder_path}")

def clear_thumbnail_queue():
    """Clear the thumbnail queue to prioritize current folder."""
    global thumbnail_queue
    # Clear the existing queue by getting all items and discarding them
    while not thumbnail_queue.empty():
        try:
            thumbnail_queue.get_nowait()
            thumbnail_queue.task_done()
        except asyncio.QueueEmpty:
            break
    print("Thumbnail queue cleared for new folder priority")

def is_current_folder_file(file_path: str) -> bool:
    """Check if a file belongs to the current folder."""
    if not current_folder:
        return False
    return file_path.startswith(current_folder + '/')

def submit_thumbnail_with_priority(file_path: str, background_tasks: BackgroundTasks):
    """Submit thumbnail generation with priority for current folder."""
    if file_path not in thumbnail_processing:
        # Check if this is a current folder file
        if is_current_folder_file(file_path):
            # For current folder, add with high priority (lower number = higher priority)
            priority = 1
            asyncio.create_task(thumbnail_queue.put((priority, file_path)))
            print(f"Priority thumbnail queued for current folder: {file_path} (priority: {priority})")
        else:
            # For other folders, add with lower priority
            priority = 10
            asyncio.create_task(thumbnail_queue.put((priority, file_path)))
            print(f"Regular thumbnail queued: {file_path} (priority: {priority})")

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
        "thumbnail_cache_size": len(thumbnail_cache),
        "thumbnail_executor_workers": thumbnail_executor._max_workers,
        "conversion_queue_size": conversion_queue.qsize(),
        "conversion_processing_count": len(conversion_processing),
        "conversion_cache_size": len(conversion_cache),
        "conversion_executor_workers": conversion_executor._max_workers,
        "current_folder": current_folder,
        "separate_executors": True
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
        
        # If not in cache and not currently processing, submit to queue with priority
        if file_path not in thumbnail_processing:
            submit_thumbnail_with_priority(file_path, background_tasks)
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
        # Set this as the current folder for thumbnail priority
        set_current_folder(folder_path)
        
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

@app.post("/api/set-current-folder/{folder_path:path}")
async def set_current_folder_endpoint(folder_path: str):
    """Set the current folder for thumbnail priority."""
    try:
        # URL decode the folder path
        from urllib.parse import unquote
        decoded_folder_path = unquote(folder_path)
        folder_full_path = Path(PHOTOS_DIR) / decoded_folder_path
        
        if not folder_full_path.exists() or not folder_full_path.is_dir():
            raise HTTPException(status_code=404, detail="Folder not found")
        
        set_current_folder(folder_path)
        
        return {
            "message": "Current folder set",
            "folder": folder_path,
            "thumbnail_priority": "enabled"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting current folder: {str(e)}")

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
            full_path.resolve().relative_to(Path(PHOTOS_DIR).resolve())
        except ValueError:
            if not str(full_path).startswith(str(Path(PHOTOS_DIR))):
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if this is a video that needs conversion
        if needs_conversion(full_path):
            # Redirect to conversion endpoint
            return RedirectResponse(url=f"/api/convert/{file_path}")
        
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

@app.get("/api/convert/{file_path:path}")
async def convert_video_stream(file_path: str, request: Request):
    """Convert and stream a video file on-the-fly."""
    try:
        # URL decode the file path
        from urllib.parse import unquote
        decoded_file_path = unquote(file_path)
        full_path = Path(PHOTOS_DIR) / decoded_file_path
        
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Security check
        try:
            full_path.resolve().relative_to(Path(PHOTOS_DIR).resolve())
        except ValueError:
            if not str(full_path).startswith(str(Path(PHOTOS_DIR))):
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if file needs conversion
        if not needs_conversion(full_path):
            raise HTTPException(status_code=400, detail="File does not need conversion")
        
        # Check if we have a cached conversion
        cache_key = f"{file_path}_converted"
        if cache_key in conversion_cache:
            cached_path = conversion_cache[cache_key]
            if isinstance(cached_path, Path) and cached_path.exists():
                # Handle HTTP Range requests for converted files
                range_header = request.headers.get("range")
                if range_header and cached_path.suffix.lower() == '.mp4':
                    file_size = cached_path.stat().st_size
                    bytes_range = range_header.replace("bytes=", "").split("-")
                    try:
                        start = int(bytes_range[0]) if bytes_range[0] else 0
                        end = int(bytes_range[1]) if len(bytes_range) > 1 and bytes_range[1] else file_size - 1
                    except ValueError:
                        start = 0
                        end = file_size - 1
                    end = min(end, file_size - 1)
                    chunk_size = end - start + 1
                    with open(cached_path, "rb") as f:
                        f.seek(start)
                        data = f.read(chunk_size)
                    headers = {
                        "Content-Range": f"bytes {start}-{end}/{file_size}",
                        "Accept-Ranges": "bytes",
                        "Content-Length": str(chunk_size),
                        "Content-Type": "video/mp4",
                    }
                    return Response(data, status_code=206, headers=headers)
                
                # No range request, serve full file
                return FileResponse(cached_path, media_type="video/mp4")
        
        # Check if currently processing
        if file_path in conversion_processing:
            return {"status": "processing", "message": "Video is being converted"}
        
        # Start streaming conversion directly
        return await stream_conversion(file_path, full_path)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting video: {str(e)}")

async def stream_conversion(file_path: str, input_path: Path):
    """Stream video conversion on-the-fly."""
    try:
        # Create a unique temporary output file for streaming
        import tempfile
        import uuid
        temp_output = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
        temp_output.close()
        output_path = Path(temp_output.name)
        
        # FFmpeg command for streaming conversion
        cmd = [
            'ffmpeg', '-i', str(input_path),
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '32',
            '-threads', '0', '-c:a', 'aac', '-b:a', '32k', '-ac', '1',
            '-f', 'mp4', '-movflags', 'frag_keyframe+empty_moov+faststart',
            '-y', str(output_path)
        ]
        
        # Start FFmpeg process
        process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            bufsize=0
        )
        
        # Wait a bit for FFmpeg to start and create the output file
        await asyncio.sleep(0.5)
        
        # Stream the output file as it's being created
        async def stream_file():
            last_position = 0
            try:
                while process.poll() is None or output_path.exists():
                    if output_path.exists():
                        # Read only new data since last read
                        with open(output_path, 'rb') as f:
                            f.seek(last_position)
                            while True:
                                chunk = f.read(8192)  # 8KB chunks
                                if not chunk:
                                    break
                                yield chunk
                            # Update position for next read
                            last_position = f.tell()
                        
                        # If process is still running, wait a bit before next read
                        if process.poll() is None:
                            await asyncio.sleep(0.1)
                        else:
                            # Process finished, read any remaining data
                            if output_path.exists():
                                with open(output_path, 'rb') as f:
                                    f.seek(last_position)
                                    while True:
                                        chunk = f.read(8192)
                                        if not chunk:
                                            break
                                        yield chunk
                            break
                    else:
                        # File doesn't exist yet, wait a bit
                        await asyncio.sleep(0.1)
            finally:
                # Clean up
                try:
                    process.terminate()
                    process.wait(timeout=5)
                except:
                    process.kill()
                
                # Clean up temporary file
                if output_path.exists():
                    output_path.unlink()
                
                print(f"Streaming conversion completed for {file_path}")
        
        # Return streaming response
        return StreamingResponse(
            stream_file(),
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache"
            }
        )
        
    except Exception as e:
        print(f"Error in streaming conversion for {file_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Streaming conversion failed: {str(e)}")

@app.get("/api/conversion-status/{file_path:path}")
async def get_conversion_status(file_path: str):
    """Check the status of video conversion for a file."""
    try:
        # URL decode the file path
        from urllib.parse import unquote
        decoded_file_path = unquote(file_path)
        full_path = Path(PHOTOS_DIR) / decoded_file_path
        
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check cache
        cache_key = f"{file_path}_converted"
        if cache_key in conversion_cache:
            cached_path = conversion_cache[cache_key]
            if cached_path.exists():
                return {"status": "ready", "path": str(cached_path)}
        
        # Check if processing
        if file_path in conversion_processing:
            return {"status": "processing"}
        
        # Not in cache and not processing
        return {"status": "not_started"}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking conversion status: {str(e)}")

@app.get("/api/conversion-cache/status")
async def get_conversion_cache_status():
    """Get the current status of the conversion cache."""
    return {
        "cache_size": len(conversion_cache),
        "processing_count": len(conversion_processing),
        "queue_size": conversion_queue.qsize(),
        "max_concurrent": MAX_CONCURRENT_CONVERSIONS,
        "cache_keys": list(conversion_cache.keys())[:10],  # Show first 10 keys
        "processing_files": list(conversion_processing)[:10]  # Show first 10 processing files
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 