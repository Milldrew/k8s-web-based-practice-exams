# Custom KIND Node Images with SSH

This directory contains custom Dockerfiles that extend the official `kindest/node` images to include SSH and useful tools pre-installed.

## Available Images

### Control Plane Images

**Dockerfile.control-plane.ready**
- Base: `kindest/node:v1.28.0`
- Includes: SSH server/client, vim, curl, jq, networking tools
- SSH: Pre-configured and ready
- Use case: Production-like scenarios with SSH access

**Dockerfile.control-plane.not-ready**
- Base: `kindest/node:v1.28.0`
- Includes: vim, curl, jq, networking tools (NO SSH)
- Use case: Scenarios requiring manual SSH setup

### Worker Node Images

**Dockerfile.worker.ready**
- Base: `kindest/node:v1.28.0`
- Includes: SSH server/client, vim, curl, jq, networking tools
- SSH: Pre-configured and ready
- Use case: Production-like scenarios with SSH access

**Dockerfile.worker.not-ready**
- Base: `kindest/node:v1.28.0`
- Includes: vim, curl, jq, networking tools (NO SSH)
- Use case: Scenarios requiring manual SSH setup

## Building Images

### Build All Images Locally

```bash
# Build all 4 images
./build-images.sh

# This creates:
#   kind-control-plane:ready
#   kind-control-plane:not-ready
#   kind-worker:ready
#   kind-worker:not-ready
```

### Build and Push to Registry

```bash
# Build and push to your registry
./build-images.sh --push harbor.yourdomain.com/k8s-images

# This creates and pushes:
#   harbor.yourdomain.com/k8s-images/kind-control-plane:ready
#   harbor.yourdomain.com/k8s-images/kind-control-plane:v1.28.0-ready
#   harbor.yourdomain.com/k8s-images/kind-control-plane:not-ready
#   harbor.yourdomain.com/k8s-images/kind-control-plane:v1.28.0-not-ready
#   harbor.yourdomain.com/k8s-images/kind-worker:ready
#   harbor.yourdomain.com/k8s-images/kind-worker:v1.28.0-ready
#   harbor.yourdomain.com/k8s-images/kind-worker:not-ready
#   harbor.yourdomain.com/k8s-images/kind-worker:v1.28.0-not-ready
```

## Using with Docker Compose

The `docker-compose.new.yml` file is configured to build and use these images automatically.

### Quick Start

```bash
# 1. Build images (first time only)
./build-images.sh

# 2. Start cluster containers
docker-compose -f docker-compose.new.yml up -d cka-a-1-control-plane cka-a-1-worker cka-a-1-worker2

# 3. Initialize the cluster
cd k8s/scripts
./init-compose-cluster.sh cka-a-1

# 4. SSH is now ready!
docker exec -it cka-a-1-control-plane bash
ssh cka-a-1-worker  # Works immediately!
```

## What's Pre-Installed

### Both Ready and Not-Ready Images

- **Kubernetes Components**: kubeadm, kubelet, kubectl, containerd (from kindest/node)
- **Tools**: vim, curl, jq, iputils-ping, net-tools

### Ready Images Only

- **SSH Server**: openssh-server (pre-configured)
- **SSH Client**: openssh-client
- **Configuration**:
  - Root login enabled
  - Empty password (no authentication required)
  - PermitEmptyPasswords enabled
  - StrictModes disabled (allows empty password)
  - SSH config for direct inter-node access

## SSH Configuration Details

### Default Settings (in Ready images)

```bash
# SSH Server Config (/etc/ssh/sshd_config)
PermitRootLogin yes              # Root can login
PasswordAuthentication yes       # Password auth enabled
PermitEmptyPasswords yes         # Allow empty passwords
StrictModes no                   # Don't enforce file permissions

# Root Password
(empty - just press Enter)

# SSH Client Config (/root/.ssh/config)
Host *
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    User root
```

### Starting SSH Daemon

The ready images include a helper script:

```bash
# Automatically start sshd if not running
/usr/local/bin/start-sshd.sh
```

This is called by the `init-compose-cluster.sh` script during initialization.

## SSH Setup

After building images and starting containers, SSH daemons need to be started:

```bash
# The init script does this automatically
./init-compose-cluster.sh cka-a-1

# Or manually
./setup-ssh-simple.sh cka-a-1
```

This script:
1. Starts SSH daemon on all nodes
2. Configures `/etc/hosts` on all nodes for hostname resolution
3. No key generation or distribution needed!

**No authentication required** - just SSH directly:
```bash
ssh hostname  # Press Enter when prompted for password
```

## Advantages of Pre-Built Images

### Speed
- No runtime package installation (apt-get install)
- Containers start immediately
- Cluster initialization is faster

### Reliability
- SSH packages are cached in the image
- No dependency on external apt repositories during runtime
- Consistent environment across all deployments

### Simplicity
- One-time build, reuse many times
- Less complex initialization scripts
- Easier to version and distribute

## Image Size Comparison

```bash
# Check image sizes
docker images | grep kind

# Expected sizes:
# kindest/node:v1.28.0           ~1.2GB
# kind-control-plane:ready       ~1.3GB (+~100MB for SSH + tools)
# kind-control-plane:not-ready   ~1.25GB (+~50MB for tools)
# kind-worker:ready             ~1.3GB (+~100MB for SSH + tools)
# kind-worker:not-ready         ~1.25GB (+~50MB for tools)
```

## Customization

### Adding More Tools

Edit the Dockerfiles and add packages:

```dockerfile
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    openssh-server \
    openssh-client \
    vim \
    curl \
    jq \
    htop \           # Add this
    tcpdump \        # And this
    strace \         # And this
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

Then rebuild:

```bash
./build-images.sh
```

### Creating Variants

Copy a Dockerfile and modify it:

```bash
# Create a minimal variant
cp Dockerfile.worker.ready Dockerfile.worker.minimal

# Edit to remove unnecessary tools
vim Dockerfile.worker.minimal

# Build with custom tag
docker build -f Dockerfile.worker.minimal -t kind-worker:minimal .
```

## Using in Kubernetes

You can also use these images with real KIND CLI:

```bash
# Pull or build the images first
docker pull kind-control-plane:ready
docker pull kind-worker:ready

# Load images into KIND
kind create cluster --name test --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  image: kind-control-plane:ready
- role: worker
  image: kind-worker:ready
EOF

# Setup SSH keys
cd k8s/scripts
./setup-ssh-keys.sh test

# Now you can SSH between nodes
docker exec -it test-control-plane bash
ssh test-worker
```

## Troubleshooting

### Image Build Fails

```bash
# Clear build cache and rebuild
docker builder prune -f
./build-images.sh
```

### SSH Not Working

```bash
# Check if SSH is installed
docker exec cka-a-1-control-plane which sshd
docker exec cka-a-1-control-plane which ssh

# Check if SSH is running
docker exec cka-a-1-control-plane pgrep sshd

# Start SSH manually
docker exec cka-a-1-control-plane /usr/sbin/sshd

# Check SSH logs
docker exec cka-a-1-control-plane tail /var/log/auth.log
```

### Can't SSH Between Nodes

```bash
# Check /etc/hosts
docker exec cka-a-1-control-plane cat /etc/hosts

# Check SSH keys
docker exec cka-a-1-control-plane ls -la /root/.ssh/

# Test SSH manually
docker exec cka-a-1-control-plane ssh -v cka-a-1-worker
```

## Best Practices

1. **Build once, use many times**: Build images and push to registry
2. **Version your images**: Tag with Kubernetes version + build number
3. **Use not-ready images** for practice exams that test SSH setup skills
4. **Use ready images** for general practice and development
5. **Keep images updated**: Rebuild when new kindest/node versions release

## Next Steps

1. Build images: `./build-images.sh`
2. Start cluster: `docker-compose -f docker-compose.new.yml up -d`
3. Initialize: `cd k8s/scripts && ./init-compose-cluster.sh cka-a-1`
4. Practice: `docker exec -it cka-a-1-control-plane bash`
