#!/bin/bash
set -e

# Configuration
IMAGE_NAME="harbor.yourdomain.com/k8s-images/express-kind-node-pty-kind-web-terminal"
TAG="${1:-latest}"
FULL_IMAGE="${IMAGE_NAME}:${TAG}"

echo "=================================="
echo "Building and Pushing Docker Image"
echo "=================================="
echo "Image: ${FULL_IMAGE}"
echo ""

# Build the image
echo "Step 1: Building Docker image..."
docker build -t "${FULL_IMAGE}" .

echo ""
echo "Step 2: Pushing image to Harbor..."
docker push "${FULL_IMAGE}"

echo ""
echo "=================================="
echo "✓ Successfully built and pushed:"
echo "  ${FULL_IMAGE}"
echo "=================================="
echo ""
echo "To deploy to Kubernetes:"
echo "  kubectl apply -f k8s-deployment.yaml"
echo ""
