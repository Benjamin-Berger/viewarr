#!/bin/bash

echo "🚀 Starting Photo Viewer in simple development mode..."
echo "📁 Photos directory: $(pwd)/photos"
echo "📸 Add your photos to the 'photos' directory to get started"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create photos directory if it doesn't exist
mkdir -p photos

# Start only the backend in Docker
echo "🐳 Starting backend container..."
docker-compose -f docker-compose.dev.yml up backend -d

# Wait a moment for backend to start
echo "⏳ Waiting for backend to start..."
sleep 3

# Check if backend is running
if curl -s http://localhost:8000 > /dev/null; then
    echo "✅ Backend is running at http://localhost:8000"
else
    echo "❌ Backend failed to start. Check the logs with: docker-compose logs backend"
    exit 1
fi

# Install frontend dependencies if node_modules doesn't exist
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install --legacy-peer-deps
    cd ..
fi

# Start frontend locally
echo "🌐 Starting frontend development server..."
cd frontend
npm start 