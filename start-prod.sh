#!/bin/bash

echo "🚀 Starting Photo Viewer in production mode..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create photos directory if it doesn't exist
mkdir -p photos

echo "📁 Photos directory: $(pwd)/photos"
echo "📸 Add your photos to the 'photos' directory to get started"

# Start the production environment
echo "🐳 Starting containers..."
docker-compose up --build -d

echo "✅ Photo Viewer is starting up!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "To stop the application: docker-compose down" 