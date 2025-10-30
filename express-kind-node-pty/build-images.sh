#!/bin/bash
set -e

# Script to build all custom KIND node images
# Usage: ./build-images.sh [--push] [registry]
# Example: ./build-images.sh
#          ./build-images.sh --push
#          ./build-images.sh --push harbor.yourdomain.com/k8s-images

PUSH=false
REGISTRY=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --push)
            PUSH=true
            shift
            ;;
        *)
            REGISTRY="$1"
            shift
            ;;
    esac
done

# Set image prefix
if [ -n "$REGISTRY" ]; then
    PREFIX="${REGISTRY}/"
else
    PREFIX=""
fi

echo "========================================="
echo "Building Custom KIND Node Images"
echo "========================================="
echo ""

# Build control-plane images
echo "Building control-plane:ready..."
docker build -f Dockerfile.control-plane.ready -t ${PREFIX}kind-control-plane:ready .
docker tag ${PREFIX}kind-control-plane:ready ${PREFIX}kind-control-plane:v1.28.0-ready

echo ""
echo "Building control-plane:not-ready..."
docker build -f Dockerfile.control-plane.not-ready -t ${PREFIX}kind-control-plane:not-ready .
docker tag ${PREFIX}kind-control-plane:not-ready ${PREFIX}kind-control-plane:v1.28.0-not-ready

echo ""
echo "Building worker:ready..."
docker build -f Dockerfile.worker.ready -t ${PREFIX}kind-worker:ready .
docker tag ${PREFIX}kind-worker:ready ${PREFIX}kind-worker:v1.28.0-ready

echo ""
echo "Building worker:not-ready..."
docker build -f Dockerfile.worker.not-ready -t ${PREFIX}kind-worker:not-ready .
docker tag ${PREFIX}kind-worker:not-ready ${PREFIX}kind-worker:v1.28.0-not-ready

echo ""
echo "========================================="
echo "Build Complete!"
echo "========================================="
echo ""
echo "Images created:"
echo "  ${PREFIX}kind-control-plane:ready"
echo "  ${PREFIX}kind-control-plane:not-ready"
echo "  ${PREFIX}kind-worker:ready"
echo "  ${PREFIX}kind-worker:not-ready"
echo ""

# Push if requested
if [ "$PUSH" = true ]; then
    if [ -z "$REGISTRY" ]; then
        echo "ERROR: --push requires a registry to be specified"
        echo "Usage: $0 --push <registry>"
        exit 1
    fi

    echo "Pushing images to $REGISTRY..."
    echo ""

    docker push ${PREFIX}kind-control-plane:ready
    docker push ${PREFIX}kind-control-plane:v1.28.0-ready
    docker push ${PREFIX}kind-control-plane:not-ready
    docker push ${PREFIX}kind-control-plane:v1.28.0-not-ready
    docker push ${PREFIX}kind-worker:ready
    docker push ${PREFIX}kind-worker:v1.28.0-ready
    docker push ${PREFIX}kind-worker:not-ready
    docker push ${PREFIX}kind-worker:v1.28.0-not-ready

    echo ""
    echo "All images pushed successfully!"
fi

echo ""
echo "Next steps:"
echo "  1. Start clusters: docker-compose -f docker-compose.new.yml up -d"
echo "  2. Initialize: cd k8s/scripts && ./init-compose-cluster.sh cka-a-1"
echo "  3. Access nodes: docker exec -it cka-a-1-control-plane bash"
echo "  4. SSH between nodes: ssh cka-a-1-worker"
