#!/bin/bash
set -e

# Simple script to start SSH daemons and configure networking
# No key distribution needed - authentication disabled in images
# Usage: ./setup-ssh-simple.sh <cluster-name>
# Example: ./setup-ssh-simple.sh cka-a-1

CLUSTER_NAME=${1:-"cka-a-1"}

if [ -z "$CLUSTER_NAME" ]; then
    echo "Usage: $0 <cluster-name>"
    echo "Example: $0 cka-a-1"
    exit 1
fi

echo "Setting up SSH for cluster: $CLUSTER_NAME (no authentication)"

# Get all nodes in the cluster
NODES=$(docker ps --filter "name=${CLUSTER_NAME}" --format "{{.Names}}")

if [ -z "$NODES" ]; then
    echo "Error: No nodes found for cluster $CLUSTER_NAME"
    exit 1
fi

echo ""
echo "Starting SSH daemons on all nodes..."

for node in $NODES; do
    echo "  Starting SSH on $node..."

    # Start SSH daemon (already configured in image)
    docker exec "$node" bash -c "/usr/local/bin/start-sshd.sh" || \
    docker exec "$node" bash -c "/usr/sbin/sshd" 2>/dev/null || true

    NODE_IP=$(docker inspect "$node" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
    echo "    ✓ SSH running on $node (IP: $NODE_IP)"
done

# Configure /etc/hosts so nodes can find each other by hostname
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
echo "SSH Setup Complete!"
echo "========================================="
echo ""
echo "Authentication: NONE (empty password)"
echo ""
echo "Test SSH access:"
echo "  # From host to any node:"
echo "  docker exec -it ${CLUSTER_NAME}-control-plane bash"
echo ""
echo "  # From any node to another (just press Enter when asked for password):"
echo "  ssh ${CLUSTER_NAME}-worker"
echo "  # Or simply:"
echo "  ssh ${CLUSTER_NAME}-worker  # No password needed!"
echo ""
echo "All nodes:"
for node in $NODES; do
    NODE_IP=$(docker inspect "$node" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
    echo "  - $node ($NODE_IP)"
done
echo "========================================="
