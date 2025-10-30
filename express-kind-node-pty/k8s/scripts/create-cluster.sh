#!/bin/bash
set -e

# Script to create a KIND cluster for K8s practice exams
# Usage: ./create-cluster.sh <exam-type> <set> <question> [cluster-type]
# Example: ./create-cluster.sh cka a 1 multi-node

EXAM_TYPE=$1
SET=$2
QUESTION=$3
CLUSTER_TYPE=${4:-multi-node}

if [ -z "$EXAM_TYPE" ] || [ -z "$SET" ] || [ -z "$QUESTION" ]; then
    echo "Usage: $0 <exam-type> <set> <question> [cluster-type]"
    echo "Example: $0 cka a 1 multi-node"
    echo ""
    echo "Cluster types: single-node, multi-node, ha-cluster"
    exit 1
fi

CLUSTER_NAME="kind-${EXAM_TYPE}-${SET}-${QUESTION}"
KIND_CONFIG="../base/kind-configs/${CLUSTER_TYPE}.yaml"

if [ ! -f "$KIND_CONFIG" ]; then
    echo "Error: KIND config not found: $KIND_CONFIG"
    echo "Available configs: single-node, multi-node, ha-cluster"
    exit 1
fi

echo "Creating KIND cluster: $CLUSTER_NAME"
echo "Configuration: $CLUSTER_TYPE"

# Check if cluster already exists
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo "Cluster $CLUSTER_NAME already exists"
    echo "Use delete-cluster.sh to remove it first"
    exit 1
fi

# Create the cluster
kind create cluster --name "$CLUSTER_NAME" --config "$KIND_CONFIG" --wait 5m

echo ""
echo "Installing Cilium CNI..."
cilium install --context "kind-${CLUSTER_NAME}" --wait

echo ""
echo "Waiting for Cilium to be ready..."
cilium status --context "kind-${CLUSTER_NAME}" --wait

echo ""
echo "Cluster ready!"
kubectl get nodes --context "kind-${CLUSTER_NAME}"

echo ""
echo "Setting up SSH on all nodes..."
./setup-ssh.sh "$CLUSTER_NAME"

echo ""
echo "========================================="
echo "Cluster: $CLUSTER_NAME created successfully"
echo "Context: kind-${CLUSTER_NAME}"
echo ""
echo "Next steps:"
echo "1. Deploy scenario: ./deploy-scenario.sh ${EXAM_TYPE} ${SET} ${QUESTION}"
echo "2. Access cluster: kubectl --context kind-${CLUSTER_NAME} get nodes"
echo "========================================="
