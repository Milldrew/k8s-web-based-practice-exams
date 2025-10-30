#!/bin/bash
set -e

# Script to deploy a practice exam scenario to a KIND cluster
# Usage: ./deploy-scenario.sh <exam-type> <set> <question>
# Example: ./deploy-scenario.sh cka a 1

EXAM_TYPE=$1
SET=$2
QUESTION=$3

if [ -z "$EXAM_TYPE" ] || [ -z "$SET" ] || [ -z "$QUESTION" ]; then
    echo "Usage: $0 <exam-type> <set> <question>"
    echo "Example: $0 cka a 1"
    exit 1
fi

CLUSTER_NAME="kind-${EXAM_TYPE}-${SET}-${QUESTION}"
OVERLAY_PATH="../overlays/${EXAM_TYPE}/${SET}-${QUESTION}"

# Check if cluster exists
if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo "Error: Cluster $CLUSTER_NAME does not exist"
    echo "Create it first: ./create-cluster.sh ${EXAM_TYPE} ${SET} ${QUESTION}"
    exit 1
fi

# Check if overlay exists
if [ ! -d "$OVERLAY_PATH" ]; then
    echo "Error: Overlay not found: $OVERLAY_PATH"
    echo "Available overlays:"
    ls -d ../overlays/*/* 2>/dev/null | sed 's|../overlays/||'
    exit 1
fi

echo "Deploying scenario: ${EXAM_TYPE}-${SET}-${QUESTION}"
echo "Cluster: $CLUSTER_NAME"
echo "Overlay: $OVERLAY_PATH"

# Set context
kubectl config use-context "kind-${CLUSTER_NAME}"

# Create SSH keys secret if it doesn't exist
NAMESPACE="${EXAM_TYPE}-${SET}-${QUESTION}"

echo ""
echo "Creating namespace if needed..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "Creating SSH keys secret..."
if [ -f /tmp/kind-ssh-key ]; then
    kubectl create secret generic ssh-keys \
        --from-file=id_rsa=/tmp/kind-ssh-key \
        --from-file=id_rsa.pub=/tmp/kind-ssh-key.pub \
        --from-file=config=/dev/null \
        -n "$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
else
    echo "Warning: SSH key not found at /tmp/kind-ssh-key"
    echo "Run setup-ssh.sh first to generate SSH keys"
fi

# Build and apply with kustomize
echo ""
echo "Building manifests with kustomize..."
kubectl kustomize "$OVERLAY_PATH"

echo ""
echo "Applying manifests..."
kubectl apply -k "$OVERLAY_PATH"

echo ""
echo "Waiting for SSH bastion to be ready..."
kubectl wait --for=condition=ready pod \
    -l app=ssh-bastion \
    -n "$NAMESPACE" \
    --timeout=120s 2>/dev/null || echo "Note: Pod may not be ready yet, check status manually"

# Get the NodePort
NODEPORT=$(kubectl get svc -n "$NAMESPACE" -l app=ssh-bastion -o jsonpath='{.items[0].spec.ports[0].nodePort}' 2>/dev/null || echo "30000")

# Get node IPs
echo ""
echo "Cluster node information:"
kubectl get nodes -o wide --context "kind-${CLUSTER_NAME}"

echo ""
echo "========================================="
echo "Scenario deployed successfully!"
echo ""
echo "Cluster: $CLUSTER_NAME"
echo "Namespace: $NAMESPACE"
echo ""
echo "Access bastion pod:"
echo "  kubectl exec -it -n $NAMESPACE deployment/ssh-bastion -- /bin/bash"
echo ""
echo "Or via NodePort (if exposed):"
echo "  ssh -p $NODEPORT root@localhost"
echo ""
echo "From bastion, SSH to nodes:"
echo "  ssh <node-name>  # e.g., ssh ${CLUSTER_NAME}-control-plane"
echo ""
echo "Check status:"
echo "  kubectl get all -n $NAMESPACE"
echo ""
echo "View logs:"
echo "  kubectl logs -n $NAMESPACE -l app=ssh-bastion -f"
echo "========================================="
