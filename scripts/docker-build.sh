#!/bin/bash

# 1. Get version from package.json
VERSION=$(node -p "require('./package.json').version")
IMAGE_NAME="rush-ielts"

echo "📦 Building Docker image: $IMAGE_NAME:$VERSION"

# 2. Build Docker Image
# Tag with version and also 'latest'
docker build -t $IMAGE_NAME:$VERSION -t $IMAGE_NAME:latest .

echo "✅ Build success!"
echo "👉 Run with: docker run -p 3000:3000 $IMAGE_NAME:$VERSION"
