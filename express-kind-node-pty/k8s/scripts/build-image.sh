#!/bin/bash
set -e

# Script to build and optionally push the websocket server image
# Usage: ./build-image.sh [push]
# Example: ./build-image.sh        # Build only
#          ./build-image.sh push   # Build and push

IMAGE_NAME=${IMAGE_NAME:-"harbor.yourdomain.com/k8s-images/express-kind-node-pty"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

DOCKERFILE="../Dockerfile.new"

if [ ! -f "$DOCKERFILE" ]; then
    echo "Error: Dockerfile not found: $DOCKERFILE"
    exit 1
fi

echo "Building image: $FULL_IMAGE"
echo "Dockerfile: $DOCKERFILE"

cd ../..

docker build -f Dockerfile.new -t "$FULL_IMAGE" .

echo ""
echo "Image built successfully: $FULL_IMAGE"

if [ "$1" == "push" ]; then
    echo ""
    echo "Pushing image to registry..."
    docker push "$FULL_IMAGE"
    echo "Image pushed successfully"
fi

echo ""
echo "To test locally:"
echo "  docker run -p 3000:3000 $FULL_IMAGE"
