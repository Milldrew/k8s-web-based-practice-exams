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
    echo 'echo "Creating Kind cluster..."' >> /start.sh && \
    echo 'kind create cluster --name k8s-practice --wait 5m' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'echo "Kind cluster is ready!"' >> /start.sh && \
    echo 'kubectl get nodes' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Set up kubectl config in bashrc' >> /start.sh && \
    echo 'echo "export KUBECONFIG=/root/.kube/config" >> /root/.bashrc' >> /start.sh && \
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
