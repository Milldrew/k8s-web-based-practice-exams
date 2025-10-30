#!/bin/bash
set -e

# Script to distribute SSH keys to all nodes in a cluster
# Since SSH is pre-installed in the images, we just need to distribute keys
# Usage: ./setup-ssh-keys.sh <cluster-name>
# Example: ./setup-ssh-keys.sh cka-a-1

CLUSTER_NAME=${1:-"cka-a-1"}

if [ -z "$CLUSTER_NAME" ]; then
    echo "Usage: $0 <cluster-name>"
    echo "Example: $0 cka-a-1"
    exit 1
fi

echo "Setting up SSH keys for cluster: $CLUSTER_NAME"

# Generate SSH key pair if it doesn't exist
if [ ! -f /tmp/kind-ssh-key ]; then
    echo "Generating SSH key pair..."
    ssh-keygen -t rsa -N "" -f /tmp/kind-ssh-key -q -C "kind-cluster-access"
fi

# Get all nodes in the cluster
NODES=$(docker ps --filter "name=${CLUSTER_NAME}" --format "{{.Names}}")

if [ -z "$NODES" ]; then
    echo "Error: No nodes found for cluster $CLUSTER_NAME"
    exit 1
fi

echo ""
echo "Distributing SSH keys to all nodes..."

for node in $NODES; do
    echo "  Configuring $node..."

    # Copy SSH public key for external access
    cat /tmp/kind-ssh-key.pub | docker exec -i "$node" bash -c "
        cat > /root/.ssh/authorized_keys && \
        chmod 600 /root/.ssh/authorized_keys
    "

    # Copy private key so nodes can SSH to each other
    cat /tmp/kind-ssh-key | docker exec -i "$node" bash -c "
        cat > /root/.ssh/id_rsa && \
        chmod 600 /root/.ssh/id_rsa
    "

    # Start SSH daemon (should already be configured from image)
    docker exec "$node" bash -c "/usr/local/bin/start-sshd.sh" || \
    docker exec "$node" bash -c "/usr/sbin/sshd" 2>/dev/null || true
done

# Configure /etc/hosts and ensure all nodes can reach each other
echo ""
echo "Configuring inter-node networking..."
for node in $NODES; do
    # Get all node IPs and names
    for target_node in $NODES; do
        TARGET_IP=$(docker inspect "$target_node" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

        # Add to /etc/hosts
        docker exec "$node" bash -c "
            grep -q '$target_node' /etc/hosts || echo '$TARGET_IP $target_node' >> /etc/hosts
        " 2>/dev/null || true
    done
done

echo ""
echo "========================================="
echo "SSH Keys Setup Complete!"
echo "========================================="
echo ""
echo "SSH Key Location: /tmp/kind-ssh-key"
echo "SSH Public Key: /tmp/kind-ssh-key.pub"
echo ""
echo "Test SSH access:"
echo "  # From host machine:"
echo "  NODE_IP=\$(docker inspect ${CLUSTER_NAME}-control-plane --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')"
echo "  ssh -i /tmp/kind-ssh-key root@\$NODE_IP"
echo ""
echo "  # From any node to another:"
echo "  docker exec -it ${CLUSTER_NAME}-control-plane bash"
echo "  ssh ${CLUSTER_NAME}-worker"
echo "========================================="
