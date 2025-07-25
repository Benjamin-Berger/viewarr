# Viewarr - Photo & Video Viewer

A modern, responsive photo and video viewer application with a React frontend and Python FastAPI backend. Viewarr provides an intuitive interface for browsing and viewing your photo collections with features like full-screen viewing, keyboard navigation, and customizable display options.

## Features

- 📁 **Folder Navigation**: Browse through organized photo folders
- 🖼️ **Grid View**: View photos in a responsive grid layout
- 🎥 **Video Support**: View both images and videos
- ⚡ **Lazy Loading**: Videos are only loaded when hovered or clicked, improving performance with large video collections
- 🎬 **Video Thumbnails**: Automatic thumbnail generation for video previews with proper aspect ratio support
- 🔍 **Full-Screen Mode**: Click any image to view it full-screen
- ⌨️ **Keyboard Navigation**:
  - Arrow keys to navigate between images
  - Escape to close full-screen view
- 🎛️ **Customizable Display**:
  - Adjustable image size slider
  - Toggle image information display
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🐳 **Docker Support**: Easy deployment with Docker containers

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Or Node.js and Python 3.11+ for local development

### Using Docker (Recommended)

1. **Clone the repository**:

   ```bash
   git clone <your-repo-url>
   cd viewarr
   ```

2. **Add your photos**:

   ```bash
   mkdir -p photos
   # Copy your photos into the photos/ directory
   ```

3. **Optional: Add personal volume mounts** (for external drives):

   Create a `docker-compose.personal.yml` file with your personal volume mounts:

   ```yaml
   version: "3.8"

   services:
     backend:
       volumes:
         - "/path/to/your/external/drive:/photos/external:ro"
   ```

   This file is already in `.gitignore` and won't be committed to git.

4. **Start the application**:

   ```bash
   # Development mode (with personal volumes)
   docker-compose -f docker-compose.dev.yml -f docker-compose.personal.yml up --build

   # Or use the script
   ./start-dev.sh

   # Production mode
   ./start-prod.sh
   ```

5. **Open your browser**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

### Local Development

1. **Start the backend**:

   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start the frontend**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Project Structure

```
viewarr/
├── frontend/              # React application
│   ├── public/           # Static files
│   │   ├── index.html    # Main HTML file
│   │   └── app.js        # React application
│   ├── package.json      # Frontend dependencies
│   └── Dockerfile        # Frontend container
├── backend/              # Python FastAPI server
│   ├── main.py           # Main application
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Backend container
├── photos/               # Photo storage (mounted volume)
├── docker-compose.yml    # Production Docker orchestration
├── docker-compose.dev.yml # Development Docker orchestration
├── start-dev.sh          # Development startup script
├── start-prod.sh         # Production startup script
└── README.md            # This file
```

## API Endpoints

- `GET /api/folders` - List all folders
- `GET /api/photos/{folder_path}` - Get photos in a specific folder
- `GET /api/photo/{file_path}` - Serve a specific photo file

## Lazy Loading Implementation

The application implements intelligent lazy loading for video files to improve performance when browsing folders with many videos:

### How it Works

1. **Initial State**: Video elements are created without a `src` attribute, preventing automatic loading
2. **Hover Detection**: Videos are loaded only when the user hovers over them for 200ms (prevents accidental loads)
3. **Click Loading**: Videos are immediately loaded when clicked for full-screen viewing
4. **HTTP Range Support**: The backend supports partial content requests for efficient video streaming
5. **Memory Management**: Proper cleanup of timeouts and event listeners

### Performance Benefits

- **Faster Initial Load**: Pages load quickly even with hundreds of video files
- **Reduced Bandwidth**: Only requested videos are downloaded
- **Better User Experience**: Smooth browsing without waiting for all videos to load
- **Efficient Streaming**: Videos use HTTP Range requests for optimal playback

### Technical Details

- Uses React's `useRef` and `useState` for state management
- Implements debounced hover detection (200ms delay)
- Supports both grid and masonry layouts
- Maintains compatibility with existing full-screen functionality

## Video Thumbnail System

The application includes an advanced thumbnail generation system for video files:

### Features

- **Automatic Generation**: Thumbnails are generated on-demand using FFmpeg
- **Background Processing**: Thumbnail generation runs asynchronously without blocking the UI
- **Smart Caching**: Generated thumbnails are cached in memory for instant retrieval
- **Aspect Ratio Support**: Thumbnails respect original video aspect ratios in Pinterest mode
- **Fallback System**: Tries 5-second mark first, falls back to 1-second for short videos
- **Low Resolution**: 150px width thumbnails for fast generation and loading

### API Endpoints

- `GET /api/thumbnail/{file_path}` - Generate thumbnail for a video file
- `GET /api/thumbnail-status/{file_path}` - Check thumbnail generation status
- `POST /api/thumbnail-cache/clear` - Clear thumbnail cache
- `GET /api/thumbnail-cache/status` - Get cache status and statistics

### Performance Optimizations

- **Concurrent Limiting**: Maximum 4 simultaneous thumbnail generations
- **Cache Invalidation**: Based on file modification time
- **Memory Management**: Automatic cleanup of processing states
- **Polling System**: Frontend polls for completion without blocking

### Testing

Use the provided test scripts to verify thumbnail functionality:

```javascript
// Test thumbnail aspect ratio
testThumbnailAspectRatio();

// Test thumbnail generation
testThumbnailGenerationAndAspectRatio();

// Monitor cache in real-time
monitorCache();
```

## Technologies Used

- **Frontend**: React 18, Tailwind CSS
- **Backend**: Python 3.11, FastAPI, Uvicorn
- **Containerization**: Docker, Docker Compose
- **File Handling**: python-magic, aiofiles

## Keyboard Shortcuts

### Full-Screen Mode

- **←/↑**: Previous image
- **→/↓**: Next image
- **Escape**: Close full-screen view

### Grid View

- **Click image**: Open full-screen view
- **Slider**: Adjust image size
- **Toggle**: Show/hide image information

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).
