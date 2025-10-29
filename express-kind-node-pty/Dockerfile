# Stage 1: Base image with all tools
FROM docker:24-dind AS base

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

# Install Cilium CLI
RUN CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt) \
    && curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz \
    && curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz.sha256sum \
    && sha256sum -c cilium-linux-amd64.tar.gz.sha256sum \
    && tar -xzf cilium-linux-amd64.tar.gz -C /usr/local/bin \
    && rm cilium-linux-amd64.tar.gz cilium-linux-amd64.tar.gz.sha256sum

# Stage 2: Application image
FROM base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy app source
COPY . .

# Copy Kind cluster configuration
COPY kind-config.yaml /kind-config.yaml

# Create a simple startup script
RUN echo '#!/bin/bash' > /start.sh && \
    echo 'set -e' >> /start.sh && \
    echo 'echo "Starting Docker daemon..."' >> /start.sh && \
    echo 'dockerd-entrypoint.sh &' >> /start.sh && \
    echo 'echo "Waiting 20 seconds for Docker to initialize..."' >> /start.sh && \
    echo 'sleep 20' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'echo "Starting Express server..."' >> /start.sh && \
    echo 'cd /app' >> /start.sh && \
    echo 'exec node server.js' >> /start.sh && \
    chmod +x /start.sh

# Expose ports
EXPOSE 3000 2222 2223

# Run the startup script
CMD ["/start.sh"]
