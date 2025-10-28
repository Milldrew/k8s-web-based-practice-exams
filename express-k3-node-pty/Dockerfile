FROM docker:24-dind

# Install dependencies (including build tools for node-pty)
RUN apk add --no-cache \
    bash \
    curl \
    nodejs \
    npm \
    python3 \
    py3-pip \
    git \
    make \
    g++ \
    gcc \
    linux-headers \
    openssh-client \
    sshpass \
    && rm -rf /var/cache/apk/*

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/

# Install Kind
RUN curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64 \
    && chmod +x ./kind \
    && mv ./kind /usr/local/bin/kind

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy app source
COPY . .

# Copy Kind cluster configuration
COPY kind-config.yaml /kind-config.yaml

# Create startup script that starts Docker daemon first, then Kind cluster
RUN echo '#!/bin/bash' > /start.sh && \
    echo 'set -e' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'echo "Starting Docker daemon..."' >> /start.sh && \
    echo '# Start Docker daemon in the background' >> /start.sh && \
    echo 'dockerd-entrypoint.sh &' >> /start.sh && \
    echo 'DOCKERD_PID=$!' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'echo "Waiting for Docker daemon to be ready..."' >> /start.sh && \
    echo 'timeout=60' >> /start.sh && \
    echo 'while [ $timeout -gt 0 ]; do' >> /start.sh && \
    echo '    if docker info >/dev/null 2>&1; then' >> /start.sh && \
    echo '        echo "Docker daemon is ready!"' >> /start.sh && \
    echo '        break' >> /start.sh && \
    echo '    fi' >> /start.sh && \
    echo '    echo "Waiting for Docker... ($timeout seconds remaining)"' >> /start.sh && \
    echo '    sleep 2' >> /start.sh && \
    echo '    timeout=$((timeout-2))' >> /start.sh && \
    echo 'done' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'if [ $timeout -le 0 ]; then' >> /start.sh && \
    echo '    echo "ERROR: Docker daemon failed to start"' >> /start.sh && \
    echo '    exit 1' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Check if cluster already exists' >> /start.sh && \
    echo 'if kind get clusters 2>/dev/null | grep -q "k8s-practice"; then' >> /start.sh && \
    echo '    echo "Kind cluster already exists, deleting it..."' >> /start.sh && \
    echo '    kind delete cluster --name k8s-practice' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'echo "Creating Kind cluster with 2 nodes..."' >> /start.sh && \
    echo 'kind create cluster --name k8s-practice --config /kind-config.yaml --wait 5m' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'echo "Kind cluster is ready!"' >> /start.sh && \
    echo 'kubectl get nodes' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Install and configure SSH on all nodes' >> /start.sh && \
    echo 'echo "Installing SSH on cluster nodes..."' >> /start.sh && \
    echo 'for node in $(docker ps --filter "name=k8s-practice" --format "{{.Names}}"); do' >> /start.sh && \
    echo '  echo "Setting up SSH on $node..."' >> /start.sh && \
    echo '  docker exec $node bash -c "apt-get update && apt-get install -y openssh-server" > /dev/null 2>&1' >> /start.sh && \
    echo '  docker exec $node bash -c "mkdir -p /run/sshd"' >> /start.sh && \
    echo '  docker exec $node bash -c "echo \"root:kubernetes\" | chpasswd"' >> /start.sh && \
    echo '  docker exec $node bash -c "sed -i \"s/#PermitRootLogin prohibit-password/PermitRootLogin yes/g\" /etc/ssh/sshd_config"' >> /start.sh && \
    echo '  docker exec $node bash -c "sed -i \"s/#PasswordAuthentication yes/PasswordAuthentication yes/g\" /etc/ssh/sshd_config"' >> /start.sh && \
    echo '  docker exec $node bash -c "/usr/sbin/sshd"' >> /start.sh && \
    echo '  echo "✓ SSH enabled on $node (password: kubernetes)"' >> /start.sh && \
    echo 'done' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Set up SSH keys for passwordless access from parent container' >> /start.sh && \
    echo 'echo "Setting up SSH keys..."' >> /start.sh && \
    echo 'mkdir -p /root/.ssh && chmod 700 /root/.ssh' >> /start.sh && \
    echo 'ssh-keygen -t rsa -N "" -f /root/.ssh/id_rsa -q' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Copy public key to both nodes' >> /start.sh && \
    echo 'for node in $(docker ps --filter "name=k8s-practice" --format "{{.Names}}"); do' >> /start.sh && \
    echo '  docker exec $node bash -c "mkdir -p /root/.ssh && chmod 700 /root/.ssh"' >> /start.sh && \
    echo '  cat /root/.ssh/id_rsa.pub | docker exec -i $node bash -c "cat > /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys"' >> /start.sh && \
    echo 'done' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Get node IPs and add to /etc/hosts' >> /start.sh && \
    echo 'CONTROL_PLANE_IP=$(docker inspect k8s-practice-control-plane --format "{{.NetworkSettings.IPAddress}}")' >> /start.sh && \
    echo 'WORKER_IP=$(docker inspect k8s-practice-worker --format "{{.NetworkSettings.IPAddress}}")' >> /start.sh && \
    echo 'echo "$CONTROL_PLANE_IP k8s-practice-control-plane" >> /etc/hosts' >> /start.sh && \
    echo 'echo "$WORKER_IP k8s-practice-worker" >> /etc/hosts' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Create SSH config for easy access' >> /start.sh && \
    echo 'cat > /root/.ssh/config << "SSHEOF"' >> /start.sh && \
    echo 'Host k8s-practice-control-plane' >> /start.sh && \
    echo '    User root' >> /start.sh && \
    echo '    StrictHostKeyChecking no' >> /start.sh && \
    echo '    UserKnownHostsFile /dev/null' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'Host k8s-practice-worker' >> /start.sh && \
    echo '    User root' >> /start.sh && \
    echo '    StrictHostKeyChecking no' >> /start.sh && \
    echo '    UserKnownHostsFile /dev/null' >> /start.sh && \
    echo 'SSHEOF' >> /start.sh && \
    echo 'chmod 600 /root/.ssh/config' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Set up kubectl config in bashrc' >> /start.sh && \
    echo 'echo "export KUBECONFIG=/root/.kube/config" >> /root/.bashrc' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Display SSH access information' >> /start.sh && \
    echo 'echo ""' >> /start.sh && \
    echo 'echo "========================================="' >> /start.sh && \
    echo 'echo "SSH Access Information:"' >> /start.sh && \
    echo 'echo "========================================="' >> /start.sh && \
    echo 'echo "From host machine:"' >> /start.sh && \
    echo 'echo "  Control Plane: ssh -p 2222 root@localhost"' >> /start.sh && \
    echo 'echo "  Worker Node:   ssh -p 2223 root@localhost"' >> /start.sh && \
    echo 'echo "  Password: kubernetes"' >> /start.sh && \
    echo 'echo ""' >> /start.sh && \
    echo 'echo "From inside kind-web-terminal container (using hostnames):"' >> /start.sh && \
    echo 'echo "  Control Plane: ssh k8s-practice-control-plane"' >> /start.sh && \
    echo 'echo "  Worker Node:   ssh k8s-practice-worker"' >> /start.sh && \
    echo 'echo ""' >> /start.sh && \
    echo 'echo "Or using IPs directly:"' >> /start.sh && \
    echo 'echo "  Control Plane: ssh root@$CONTROL_PLANE_IP"' >> /start.sh && \
    echo 'echo "  Worker Node:   ssh root@$WORKER_IP"' >> /start.sh && \
    echo 'echo "  (SSH keys configured - no password needed)"' >> /start.sh && \
    echo 'echo "========================================="' >> /start.sh && \
    echo 'echo ""' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Start the Node.js application' >> /start.sh && \
    echo 'echo "Starting Express server..."' >> /start.sh && \
    echo 'cd /app' >> /start.sh && \
    echo 'node server.js' >> /start.sh && \
    chmod +x /start.sh

# Expose port
EXPOSE 3000

# Run the startup script
CMD ["/start.sh"]
