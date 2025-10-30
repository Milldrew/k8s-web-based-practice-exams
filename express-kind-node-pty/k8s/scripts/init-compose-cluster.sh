#!/bin/bash
set -e

# Script to initialize a KIND cluster running in docker-compose
# Usage: ./init-compose-cluster.sh <cluster-name>
# Example: ./init-compose-cluster.sh cka-a-1

CLUSTER_NAME=${1:-"cka-a-1"}

if [ -z "$CLUSTER_NAME" ]; then
    echo "Usage: $0 <cluster-name>"
    echo "Example: $0 cka-a-1"
    exit 1
fi

CONTROL_PLANE="${CLUSTER_NAME}-control-plane"

echo "Initializing cluster: $CLUSTER_NAME"

# Wait for control-plane container to be ready
echo "Waiting for control-plane container to be ready..."
timeout=60
while [ $timeout -gt 0 ]; do
    if docker exec $CONTROL_PLANE test -f /kind/bin/kubeadm 2>/dev/null; then
        echo "Control-plane container is ready!"
        break
    fi
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo "ERROR: Control-plane container not ready"
    exit 1
fi

# Check if cluster is already initialized
if docker exec $CONTROL_PLANE kubectl get nodes 2>/dev/null; then
    echo "Cluster already initialized"
else
    echo "Initializing Kubernetes control-plane..."

    # Initialize control-plane with kubeadm
    docker exec $CONTROL_PLANE kubeadm init \
        --skip-phases=preflight \
        --kubernetes-version=v1.28.0 \
        --pod-network-cidr=10.244.0.0/16 \
        --service-cidr=10.96.0.0/12

    # Set up kubeconfig
    docker exec $CONTROL_PLANE mkdir -p /root/.kube
    docker exec $CONTROL_PLANE cp /etc/kubernetes/admin.conf /root/.kube/config
    docker exec $CONTROL_PLANE chown root:root /root/.kube/config
fi

# Get join command
echo ""
echo "Getting worker join command..."
JOIN_CMD=$(docker exec $CONTROL_PLANE kubeadm token create --print-join-command)

# Join worker nodes if they exist
for node in $(docker ps --filter "label=io.x-k8s.kind.cluster=${CLUSTER_NAME}" --filter "label=io.x-k8s.kind.role=worker" --format "{{.Names}}"); do
    echo ""
    echo "Joining worker node: $node"

    # Check if already joined
    if docker exec $CONTROL_PLANE kubectl get node $node 2>/dev/null; then
        echo "Node $node already joined"
    else
        docker exec $node $JOIN_CMD
    fi
done

# Install CNI (Cilium)
echo ""
echo "Installing Cilium CNI..."
if ! docker exec $CONTROL_PLANE kubectl get ds -n kube-system cilium 2>/dev/null; then
    # Install Cilium CLI
    echo "Installing Cilium CLI..."
    docker exec $CONTROL_PLANE bash -c "
        CILIUM_CLI_VERSION=\$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
        curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/\${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
        tar -xzf cilium-linux-amd64.tar.gz -C /usr/local/bin
        rm cilium-linux-amd64.tar.gz
    "

    # Install Cilium
    docker exec $CONTROL_PLANE cilium install --wait

    echo "Waiting for Cilium to be ready..."
    docker exec $CONTROL_PLANE cilium status --wait
fi

# Wait for nodes to be ready
echo ""
echo "Waiting for nodes to be ready..."
docker exec $CONTROL_PLANE kubectl wait --for=condition=Ready nodes --all --timeout=300s

echo ""
echo "Cluster initialized successfully!"
docker exec $CONTROL_PLANE kubectl get nodes -o wide

# Set up SSH on nodes (SSH already installed and configured in images)
echo ""
echo "Setting up SSH on all nodes..."
./setup-ssh-simple.sh $CLUSTER_NAME

# Export kubeconfig
KUBECONFIG_PATH="/tmp/${CLUSTER_NAME}-kubeconfig"
docker exec $CONTROL_PLANE cat /etc/kubernetes/admin.conf > $KUBECONFIG_PATH

echo ""
echo "========================================="
echo "Cluster: $CLUSTER_NAME ready!"
echo ""
echo "Kubeconfig saved to: $KUBECONFIG_PATH"
echo ""
echo "Access cluster:"
echo "  export KUBECONFIG=$KUBECONFIG_PATH"
echo "  kubectl get nodes"
echo ""
echo "Or exec into control-plane:"
echo "  docker exec -it $CONTROL_PLANE bash"
echo "========================================="
