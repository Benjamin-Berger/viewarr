# Viewarr - Photo & Video Viewer

A modern, responsive photo and video viewer application with a React frontend and Python FastAPI backend. Viewarr provides an intuitive interface for browsing and viewing your photo collections with features like full-screen viewing, keyboard navigation, and customizable display options.

## Features

- 📁 **Folder Navigation**: Browse through organized photo folders
- 🖼️ **Grid View**: View photos in a responsive grid layout
- 🎥 **Video Support**: View both images and videos
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
