# Docker Compose Guide - Ready vs Not Ready

This project provides two docker-compose configurations for different use cases.

## Overview

| File | Cluster State | Use Case |
|------|--------------|----------|
| `docker-compose.not-ready.yml` | SSH ready, K8s NOT initialized | Practice cluster setup, manual kubeadm |
| `docker-compose.ready.yml` | SSH + K8s fully initialized | Jump straight to practicing K8s tasks |

## docker-compose.not-ready.yml

**What you get:**
- ✅ Containers running with SSH pre-installed
- ✅ Empty password SSH (just press Enter)
- ❌ NO Kubernetes cluster initialized
- ❌ kubeadm init/join NOT run
- ❌ CNI NOT installed

**When to use:**
- Learning how to set up Kubernetes from scratch
- Practicing `kubeadm init` and `kubeadm join`
- Understanding CNI installation
- CKA exam preparation (cluster setup questions)

### Usage

```bash
# 1. Build images (first time only)
./build-images.sh

# 2. Start containers
docker-compose -f docker-compose.not-ready.yml up -d cka-a-1-control-plane cka-a-1-worker cka-a-1-worker2

# 3. Initialize cluster manually
cd k8s/scripts
./init-compose-cluster.sh cka-a-1

# 4. Access cluster
docker exec -it cka-a-1-control-plane bash
kubectl get nodes
```

### Available Clusters

**CKA-A-1** (multi-node)
```bash
docker-compose -f docker-compose.not-ready.yml up -d \
  cka-a-1-control-plane cka-a-1-worker cka-a-1-worker2
```

**CKA-A-2** (multi-node)
```bash
docker-compose -f docker-compose.not-ready.yml up -d \
  cka-a-2-control-plane cka-a-2-worker cka-a-2-worker2
```

**CKAD-A-1** (single-node)
```bash
docker-compose -f docker-compose.not-ready.yml up -d ckad-a-1-control-plane
```

## docker-compose.ready.yml

**What you get:**
- ✅ Containers running with SSH pre-installed
- ✅ Empty password SSH (just press Enter)
- ✅ Kubernetes cluster FULLY initialized
- ✅ kubeadm init/join completed automatically
- ✅ Cilium CNI installed and running
- ✅ Nodes in Ready state

**When to use:**
- Practicing Kubernetes workloads (deployments, services, etc.)
- CKAD exam preparation
- Quick testing of K8s features
- When you don't want to wait for cluster setup

### Usage

**Option 1: Quick Start Script (Recommended)**
```bash
# 1. Build images (first time only)
./build-images.sh

# 2. Quick start (starts containers + auto-initializes)
./quick-start.sh cka-a-1

# That's it! Cluster is ready in ~90 seconds
docker exec -it cka-a-1-control-plane bash
kubectl get nodes  # Should show all nodes Ready!
```

**Option 2: Manual Steps**
```bash
# 1. Build images (first time only)
./build-images.sh

# 2. Start containers
docker-compose -f docker-compose.ready.yml up -d cka-a-1-control-plane cka-a-1-worker cka-a-1-worker2

# 3. Wait 10 seconds for containers to boot

# 4. Initialize cluster
cd k8s/scripts
./init-compose-cluster.sh cka-a-1

# 5. Access cluster (ready!)
docker exec -it cka-a-1-control-plane bash
kubectl get nodes  # Should show all nodes Ready!
```

### Available Clusters

**CKA-A-1** (multi-node, auto-init)
```bash
# Quick way
./quick-start.sh cka-a-1

# Or manual
docker-compose -f docker-compose.ready.yml up -d \
  cka-a-1-control-plane cka-a-1-worker cka-a-1-worker2
sleep 10
cd k8s/scripts && ./init-compose-cluster.sh cka-a-1
```

**CKAD-A-1** (single-node, auto-init)
```bash
# Quick way
./quick-start.sh ckad-a-1

# Or manual
docker-compose -f docker-compose.ready.yml up -d ckad-a-1-control-plane
sleep 10
cd k8s/scripts && ./init-compose-cluster.sh ckad-a-1
```

## How Ready Version Works

The "ready" version uses the same containers as "not-ready" but includes helper scripts:

### Quick Start Script (`quick-start.sh`)

1. Starts containers with `docker-compose -f docker-compose.ready.yml up -d`
2. Waits 10 seconds for containers to boot
3. Runs `init-compose-cluster.sh` which:
   - Runs `kubeadm init` on control-plane
   - Gets join command and joins workers
   - Installs Cilium CNI
   - Waits for all nodes to be Ready
4. Cluster is ready to use!

**Key difference from not-ready:**
- Same containers, just automated with helper script
- No command override (preserves KIND node entrypoint)
- Reliable and consistent initialization

## Persistent Volumes

Both docker-compose files now include persistent volumes to maintain cluster state across container restarts:

**Control-plane nodes persist:**
- `/etc/kubernetes` - Cluster configuration and certificates
- `/var/lib/kubelet` - Kubelet data
- `/var/lib/etcd` - etcd database (cluster state)

**Worker nodes persist:**
- `/var/lib/kubelet` - Kubelet data

**What this means:**
- Restart containers without losing cluster state
- `docker restart cka-a-1-control-plane` preserves the cluster
- `docker-compose restart` keeps everything initialized
- Volumes persist until you run `docker-compose down -v`

## Comparison

### Starting Containers

**Not Ready:**
```bash
docker-compose -f docker-compose.not-ready.yml up -d
# Containers start in ~5 seconds
# SSH works immediately
# NO Kubernetes running
```

**Ready (with quick-start.sh):**
```bash
./quick-start.sh cka-a-1
# Containers start in ~10 seconds
# Auto-init takes ~60-90 seconds
# Full Kubernetes cluster ready!
```

### Time to Working Cluster

| Method | Time | Steps |
|--------|------|-------|
| Not Ready + manual init | ~2 minutes | Start containers + run init script |
| Ready auto-init | ~60 seconds | Just start containers |

## Switching Between Versions

You can have both running simultaneously (different clusters):

```bash
# Start not-ready version of CKA-A-1
docker-compose -f docker-compose.not-ready.yml up -d \
  cka-a-1-control-plane cka-a-1-worker cka-a-1-worker2

# Start ready version of CKAD-A-1
docker-compose -f docker-compose.ready.yml up -d ckad-a-1-control-plane

# Different cluster names, no conflicts!
```

## Cleaning Up

**Not Ready:**
```bash
docker-compose -f docker-compose.not-ready.yml down
```

**Ready:**
```bash
docker-compose -f docker-compose.ready.yml down
```

**Both:**
```bash
docker-compose -f docker-compose.not-ready.yml down
docker-compose -f docker-compose.ready.yml down
```

## Troubleshooting

### Ready Version - Cluster Not Initializing

```bash
# Check control-plane logs
docker logs cka-a-1-control-plane

# Check if kubeadm init ran
docker exec cka-a-1-control-plane ls -la /etc/kubernetes/admin.conf

# Manually check cluster status
docker exec cka-a-1-control-plane kubectl get nodes
```

### Ready Version - Workers Not Joining

```bash
# Check worker logs
docker logs cka-a-1-worker

# Check if SSH to control-plane works
docker exec cka-a-1-worker ssh cka-a-1-control-plane

# Manually get join command
docker exec cka-a-1-control-plane kubeadm token create --print-join-command
```

### Not Ready Version - Init Script Fails

```bash
# Check if containers are running
docker ps | grep cka-a-1

# Check SSH works
docker exec cka-a-1-control-plane ssh cka-a-1-worker

# Run init manually
cd k8s/scripts
./init-compose-cluster.sh cka-a-1
```

## Best Practices

### For Learning

Use **not-ready** version when:
- Learning Kubernetes cluster setup
- Practicing for CKA exam
- Understanding kubeadm workflow
- Testing different CNI configurations

### For Practice

Use **ready** version when:
- Practicing CKAD topics
- Testing deployments, services, etc.
- Quick experimentation
- Don't want to wait for cluster setup

### Resource Usage

**Not Ready (after manual init):**
- Control-plane: ~500MB RAM
- Worker: ~300MB RAM
- Total for multi-node: ~1.1GB RAM

**Ready (auto-init):**
- Same resource usage after initialization
- Slightly higher CPU during init (~30 seconds)

## Advanced: Creating Custom Ready Configurations

You can modify `docker-compose.ready.yml` to change auto-init behavior:

```yaml
command: >
  bash -c "
  set -e
  /usr/sbin/sshd

  # Your custom init here
  kubeadm init --your-custom-flags

  # Install different CNI (default is Cilium)
  cilium install --wait

  tail -f /dev/null
  "
```

## Next Steps

1. Choose the right version for your use case
2. Build images: `./build-images.sh`
3. Start containers with chosen compose file
4. Practice Kubernetes!
