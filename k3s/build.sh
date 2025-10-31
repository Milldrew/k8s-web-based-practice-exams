#!/bin/bash

set -e

# Configuration
HARBOR_REGISTRY="harbor.yourdomain.com"
REPOSITORY="k8s-images"
TAG="latest"

# Image names
SERVER_IMAGE="${HARBOR_REGISTRY}/${REPOSITORY}/k3s-server-ssh:${TAG}"
AGENT_IMAGE="${HARBOR_REGISTRY}/${REPOSITORY}/k3s-agent-ssh:${TAG}"

echo "=========================================="
echo "Building custom k3s images with SSH"
echo "=========================================="
echo ""

# Build k3s-server image
echo "Building k3s-server-ssh image..."
docker build -f Dockerfile.k3s-server -t ${SERVER_IMAGE} .
echo "✓ k3s-server-ssh image built successfully"
echo ""

# Build k3s-agent image
echo "Building k3s-agent-ssh image..."
docker build -f Dockerfile.k3s-agent -t ${AGENT_IMAGE} .
echo "✓ k3s-agent-ssh image built successfully"
echo ""

echo "=========================================="
echo "Built images:"
echo "  - ${SERVER_IMAGE}"
echo "  - ${AGENT_IMAGE}"
echo "=========================================="
echo ""

# Ask if user wants to push
read -p "Do you want to push these images to Harbor? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Pushing images to Harbor..."
    echo ""

    # Login to Harbor (if not already logged in)
    echo "Logging in to Harbor registry..."
    docker login ${HARBOR_REGISTRY}

    # Push images
    echo "Pushing k3s-server-ssh..."
    docker push ${SERVER_IMAGE}
    echo "✓ k3s-server-ssh pushed successfully"
    echo ""

    echo "Pushing k3s-agent-ssh..."
    docker push ${AGENT_IMAGE}
    echo "✓ k3s-agent-ssh pushed successfully"
    echo ""

    echo "=========================================="
    echo "All images pushed successfully!"
    echo "=========================================="
else
    echo ""
    echo "Images built but not pushed."
    echo "To push later, run:"
    echo "  docker push ${SERVER_IMAGE}"
    echo "  docker push ${AGENT_IMAGE}"
fi

echo ""
echo "To test locally before pushing:"
echo "  docker run -it --rm --privileged ${SERVER_IMAGE}"
echo "  docker run -it --rm --privileged ${AGENT_IMAGE}"
