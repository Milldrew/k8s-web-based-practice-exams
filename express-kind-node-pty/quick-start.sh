#!/bin/bash
set -e

# Quick start script - starts containers and auto-initializes cluster
# Usage: ./quick-start.sh <cluster-name>
# Example: ./quick-start.sh cka-a-1

CLUSTER_NAME=${1:-"cka-a-1"}

# Validate cluster name
case $CLUSTER_NAME in
    cka-a-1|cka-a-2|ckad-a-1)
        ;;
    *)
        echo "Error: Invalid cluster name"
        echo "Usage: $0 <cluster-name>"
        echo ""
        echo "Available clusters:"
        echo "  cka-a-1   - Multi-node CKA cluster"
        echo "  cka-a-2   - Multi-node CKA cluster"
        echo "  ckad-a-1  - Single-node CKAD cluster"
        exit 1
        ;;
esac

echo "========================================="
echo "Quick Start: $CLUSTER_NAME"
echo "========================================="
echo ""

# Determine which containers to start
case $CLUSTER_NAME in
    cka-a-1)
        CONTAINERS="cka-a-1-control-plane cka-a-1-worker cka-a-1-worker2"
        ;;
    cka-a-2)
        CONTAINERS="cka-a-2-control-plane cka-a-2-worker cka-a-2-worker2"
        ;;
    ckad-a-1)
        CONTAINERS="ckad-a-1-control-plane"
        ;;
esac

echo "Step 1: Starting containers..."
docker-compose -f docker-compose.ready.yml up -d $CONTAINERS

echo ""
echo "Step 2: Waiting for containers to be ready..."
sleep 10

echo ""
echo "Step 3: Initializing Kubernetes cluster..."
cd k8s/scripts
./init-compose-cluster.sh $CLUSTER_NAME
cd ../..

echo ""
echo "========================================="
echo "Cluster Ready!"
echo "========================================="
echo ""
echo "Access the cluster:"
echo "  docker exec -it ${CLUSTER_NAME}-control-plane bash"
echo ""
echo "Or use kubeconfig from host:"
echo "  export KUBECONFIG=/tmp/${CLUSTER_NAME}-kubeconfig"
echo "  kubectl get nodes"
echo ""
echo "SSH between nodes:"
echo "  docker exec -it ${CLUSTER_NAME}-control-plane bash"
echo "  ssh ${CLUSTER_NAME}-worker  # (just press Enter for password)"
echo ""
echo "Stop cluster:"
echo "  docker-compose -f docker-compose.ready.yml down"
echo "========================================="
