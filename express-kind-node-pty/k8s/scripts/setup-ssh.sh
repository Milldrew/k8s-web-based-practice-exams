#!/bin/bash
set -e

# Script to enable SSH on all KIND cluster nodes
# Usage: ./setup-ssh.sh <cluster-name>
# Example: ./setup-ssh.sh cka-a-1

CLUSTER_NAME=${1:-"kind"}

if [ -z "$CLUSTER_NAME" ]; then
    echo "Usage: $0 <cluster-name>"
    echo "Example: $0 cka-a-1"
    exit 1
fi

echo "Setting up SSH on KIND cluster: $CLUSTER_NAME"

# Check if cluster exists
if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo "Error: Cluster $CLUSTER_NAME does not exist"
    exit 1
fi

# Generate SSH key pair if it doesn't exist
if [ ! -f /tmp/kind-ssh-key ]; then
    echo "Generating SSH key pair..."
    ssh-keygen -t rsa -N "" -f /tmp/kind-ssh-key -q -C "kind-cluster-access"
fi

echo ""
echo "Installing and configuring SSH on all nodes..."

# Get all nodes in the cluster
NODES=$(docker ps --filter "name=${CLUSTER_NAME}" --format "{{.Names}}")

if [ -z "$NODES" ]; then
    echo "Error: No nodes found for cluster $CLUSTER_NAME"
    exit 1
fi

for node in $NODES; do
    echo ""
    echo "Setting up SSH on node: $node"

    # Install OpenSSH server AND client
    echo "  Installing openssh-server and openssh-client..."
    docker exec "$node" bash -c "
        apt-get update -qq > /dev/null 2>&1 && \
        DEBIAN_FRONTEND=noninteractive apt-get install -y -qq openssh-server openssh-client > /dev/null 2>&1
    " || {
        echo "  Warning: Could not install openssh packages on $node"
        continue
    }

    # Configure SSH - Key-based authentication only
    echo "  Configuring SSH..."
    docker exec "$node" bash -c "
        mkdir -p /run/sshd /root/.ssh && \
        chmod 700 /root/.ssh && \
        sed -i 's/#PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config && \
        sed -i 's/PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config && \
        sed -i 's/#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && \
        sed -i 's/PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && \
        sed -i 's/#PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config && \
        sed -i 's/PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
    "

    # Copy SSH public key
    echo "  Copying SSH keys..."
    cat /tmp/kind-ssh-key.pub | docker exec -i "$node" bash -c "
        cat > /root/.ssh/authorized_keys && \
        chmod 600 /root/.ssh/authorized_keys
    "

    # Copy private key so nodes can SSH to each other
    cat /tmp/kind-ssh-key | docker exec -i "$node" bash -c "
        cat > /root/.ssh/id_rsa && \
        chmod 600 /root/.ssh/id_rsa
    "

    # Start SSH daemon
    echo "  Starting SSH daemon..."
    docker exec "$node" bash -c "/usr/sbin/sshd" || {
        echo "  Warning: Could not start sshd on $node"
        continue
    }

    # Get node IP
    NODE_IP=$(docker inspect "$node" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

    echo "  ✓ SSH enabled on $node (IP: $NODE_IP)"
    echo "    Authentication: Key-based only"
    echo "    Key: /tmp/kind-ssh-key"
done

# Create /etc/hosts entries and SSH config on all nodes
echo ""
echo "Configuring inter-node SSH access..."
for node in $NODES; do
    # Get all node IPs and names
    for target_node in $NODES; do
        TARGET_IP=$(docker inspect "$target_node" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

        # Add to /etc/hosts
        docker exec "$node" bash -c "
            grep -q '$target_node' /etc/hosts || echo '$TARGET_IP $target_node' >> /etc/hosts
        "
    done

    # Create SSH config for passwordless access
    docker exec "$node" bash -c "
        cat > /root/.ssh/config <<EOF
Host *
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    User root
EOF
        chmod 600 /root/.ssh/config
    "
done

echo "  ✓ All nodes can now SSH to each other"

echo ""
echo "========================================="
echo "SSH Setup Complete!"
echo "========================================="
echo ""
echo "SSH Key Location: /tmp/kind-ssh-key"
echo "SSH Public Key: /tmp/kind-ssh-key.pub"
echo ""
echo "To access nodes from your machine:"
echo "  # Get node IP:"
echo "  docker inspect ${CLUSTER_NAME}-control-plane --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'"
echo ""
echo "  # SSH to node (key-based auth only):"
echo "  ssh -i /tmp/kind-ssh-key root@<node-ip>"
echo ""
echo "To deploy SSH bastion pod:"
echo "  kubectl create secret generic ssh-keys \\"
echo "    --from-file=id_rsa=/tmp/kind-ssh-key \\"
echo "    --from-file=id_rsa.pub=/tmp/kind-ssh-key.pub \\"
echo "    -n k8s-practice"
echo ""
echo "========================================="
