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
echo "Pushing k3s images to Harbor"
echo "=========================================="
echo ""

# Login to Harbor
echo "Logging in to Harbor registry..."
docker login ${HARBOR_REGISTRY}
echo ""

# Push k3s-server image
echo "Pushing k3s-server-ssh..."
docker push ${SERVER_IMAGE}
echo "✓ k3s-server-ssh pushed successfully"
echo ""

# Push k3s-agent image
echo "Pushing k3s-agent-ssh..."
docker push ${AGENT_IMAGE}
echo "✓ k3s-agent-ssh pushed successfully"
echo ""

echo "=========================================="
echo "All images pushed successfully!"
echo "=========================================="
echo ""
echo "Images pushed:"
echo "  - ${SERVER_IMAGE}"
echo "  - ${AGENT_IMAGE}"
