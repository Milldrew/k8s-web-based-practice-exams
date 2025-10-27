FROM ubuntu:latest

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    ca-certificates \
    gnupg \
    lsb-release \
    build-essential \
    python3 \
    git \
    sudo \
    iptables \
    iproute2 \
    systemd \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install k3s binary directly with specific version
# Note: The systemctl enable command will fail in Docker build (expected), but the binary installs successfully
RUN curl -sfL https://get.k3s.io | INSTALL_K3S_SKIP_START=true INSTALL_K3S_SKIP_ENABLE=true INSTALL_K3S_VERSION=v1.28.5+k3s1 sh -

# Set up k3s to run in container mode
ENV KUBECONFIG=/etc/rancher/k3s/k3s.yaml
ENV PATH="/usr/local/bin:${PATH}"

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy app source
COPY . .

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Starting k3s..."\n\
k3s server --disable=traefik --disable=servicelb --write-kubeconfig-mode=644 &\n\
K3S_PID=$!\n\
\n\
# Wait for k3s to be ready\n\
echo "Waiting for k3s to be ready..."\n\
timeout=60\n\
while [ $timeout -gt 0 ]; do\n\
    if k3s kubectl get nodes 2>/dev/null; then\n\
        echo "k3s is ready!"\n\
        break\n\
    fi\n\
    echo "Waiting for k3s... ($timeout seconds remaining)"\n\
    sleep 2\n\
    timeout=$((timeout-2))\n\
done\n\
\n\
if [ $timeout -le 0 ]; then\n\
    echo "ERROR: k3s failed to start in time"\n\
    exit 1\n\
fi\n\
\n\
# Set up kubectl alias if not already set\n\
echo "alias kubectl=\"k3s kubectl\"" >> /root/.bashrc\n\
\n\
# Start the Node.js application\n\
echo "Starting Express server..."\n\
node server.js\n\
' > /start.sh && chmod +x /start.sh

# Expose port
EXPOSE 3000

# Run the startup script
CMD ["/start.sh"]
