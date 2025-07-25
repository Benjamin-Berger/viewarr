#!/bin/bash

echo "🚀 Starting Photo Viewer in development mode..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create photos directory if it doesn't exist
mkdir -p photos

echo "📁 Photos directory: $(pwd)/photos"
echo "📸 Add your photos to the 'photos' directory to get started"

# Check if personal volumes file exists
if [ -f "docker-compose.personal.yml" ]; then
    echo "🔗 Personal volumes detected, including them..."
    docker-compose -f docker-compose.dev.yml -f docker-compose.personal.yml up --build
else
    echo "📝 No personal volumes found. Create docker-compose.personal.yml to add external drives."
    docker-compose -f docker-compose.dev.yml up --build
fi

echo "✅ Photo Viewer is starting up!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs" 