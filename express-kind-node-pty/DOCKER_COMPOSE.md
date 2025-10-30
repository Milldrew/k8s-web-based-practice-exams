# Docker Compose Usage Guide

This guide explains how to run KIND clusters using Docker Compose for local testing.

## Architecture

The docker-compose setup creates KIND node containers directly:
- Each service = a Kubernetes node (control-plane or worker)
- Nodes are connected via Docker networks
- Clusters are initialized using `kubeadm`

## Quick Start

### 1. Start the Cluster Containers

```bash
# Start a single cluster (CKA-A-1: 1 control-plane + 2 workers)
docker-compose -f docker-compose.new.yml up -d cka-a-1-control-plane cka-a-1-worker cka-a-1-worker2

# Or start all clusters
docker-compose -f docker-compose.new.yml up -d
```

### 2. Initialize the Cluster

```bash
cd k8s/scripts

# Initialize the cluster (runs kubeadm init/join + installs CNI + sets up SSH)
./init-compose-cluster.sh cka-a-1
```

This script will:
- Run `kubeadm init` on the control-plane
- Join worker nodes to the cluster
- Install Calico CNI
- Set up SSH on all nodes
- Export kubeconfig to `/tmp/cka-a-1-kubeconfig`

### 3. Access the Cluster

```bash
# Option 1: Use the exported kubeconfig
export KUBECONFIG=/tmp/cka-a-1-kubeconfig
kubectl get nodes

# Option 2: Exec into control-plane
docker exec -it cka-a-1-control-plane bash
kubectl get nodes

# Option 3: SSH to nodes (after SSH setup)
NODE_IP=$(docker inspect cka-a-1-control-plane --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
ssh -i /tmp/kind-ssh-key root@$NODE_IP
```

### 4. Deploy SSH Bastion (Optional)

```bash
# Deploy bastion pod
./deploy-scenario.sh cka a 1

# Access bastion
kubectl --kubeconfig=/tmp/cka-a-1-kubeconfig exec -it -n cka-a-1 deployment/cka-a-1-ssh-bastion -- /bin/bash

# From bastion, SSH to nodes
ssh cka-a-1-control-plane
ssh cka-a-1-worker
```

### 5. Clean Up

```bash
# Stop and remove containers
docker-compose -f docker-compose.new.yml down

# Remove volumes
docker-compose -f docker-compose.new.yml down -v
```

## Available Clusters

### CKA-A-1 (Multi-node)
```bash
docker-compose -f docker-compose.new.yml up -d cka-a-1-control-plane cka-a-1-worker cka-a-1-worker2
cd k8s/scripts && ./init-compose-cluster.sh cka-a-1
```

- Control-plane: `cka-a-1-control-plane` (172.20.0.2)
- Worker 1: `cka-a-1-worker` (172.20.0.3)
- Worker 2: `cka-a-1-worker2` (172.20.0.4)
- API Server: `https://localhost:6443`
- Bastion Port: `30001`

### CKA-A-2 (Multi-node)
```bash
docker-compose -f docker-compose.new.yml up -d cka-a-2-control-plane cka-a-2-worker cka-a-2-worker2
cd k8s/scripts && ./init-compose-cluster.sh cka-a-2
```

- Control-plane: `cka-a-2-control-plane` (172.21.0.2)
- Worker 1: `cka-a-2-worker` (172.21.0.3)
- Worker 2: `cka-a-2-worker2` (172.21.0.4)
- API Server: `https://localhost:6444`
- Bastion Port: `30002`

### CKAD-A-1 (Single-node)
```bash
docker-compose -f docker-compose.new.yml up -d ckad-a-1-control-plane
cd k8s/scripts && ./init-compose-cluster.sh ckad-a-1
```

- Control-plane: `ckad-a-1-control-plane` (172.22.0.2)
- API Server: `https://localhost:6445`
- Bastion Port: `30101`

## Complete Workflow Example

```bash
# 1. Start containers for CKA-A-1
docker-compose -f docker-compose.new.yml up -d \
    cka-a-1-control-plane \
    cka-a-1-worker \
    cka-a-1-worker2

# 2. Wait a moment for containers to be ready
sleep 5

# 3. Initialize the cluster
cd k8s/scripts
./init-compose-cluster.sh cka-a-1

# 4. Use the cluster
export KUBECONFIG=/tmp/cka-a-1-kubeconfig
kubectl get nodes
kubectl get pods -A

# 5. Practice CKA tasks
kubectl create deployment nginx --image=nginx --replicas=3
kubectl get deployments

# 6. Deploy bastion for SSH access
./deploy-scenario.sh cka a 1

# 7. Access via bastion
kubectl exec -it -n cka-a-1 deployment/cka-a-1-ssh-bastion -- /bin/bash

# Inside bastion
ssh cka-a-1-control-plane
# Now you're on the control-plane node!

# 8. Clean up when done
cd ../..
docker-compose -f docker-compose.new.yml down
```

## Running Multiple Clusters

You can run multiple clusters simultaneously:

```bash
# Start all clusters
docker-compose -f docker-compose.new.yml up -d

# Initialize each cluster
cd k8s/scripts
./init-compose-cluster.sh cka-a-1
./init-compose-cluster.sh cka-a-2
./init-compose-cluster.sh ckad-a-1

# Access each cluster
export KUBECONFIG=/tmp/cka-a-1-kubeconfig
kubectl get nodes

export KUBECONFIG=/tmp/cka-a-2-kubeconfig
kubectl get nodes

export KUBECONFIG=/tmp/ckad-a-1-kubeconfig
kubectl get nodes
```

## Troubleshooting

### Containers won't start

```bash
# Check Docker is running
docker ps

# Check logs
docker-compose -f docker-compose.new.yml logs cka-a-1-control-plane

# Restart
docker-compose -f docker-compose.new.yml restart
```

### Cluster initialization fails

```bash
# Reset and try again
docker exec cka-a-1-control-plane kubeadm reset -f
docker exec cka-a-1-worker kubeadm reset -f
docker exec cka-a-1-worker2 kubeadm reset -f

# Re-initialize
./init-compose-cluster.sh cka-a-1
```

### Nodes not joining

```bash
# Check control-plane is ready
docker exec cka-a-1-control-plane kubectl get nodes

# Check worker logs
docker logs cka-a-1-worker

# Manually join
JOIN_CMD=$(docker exec cka-a-1-control-plane kubeadm token create --print-join-command)
docker exec cka-a-1-worker $JOIN_CMD
```

### CNI not working

```bash
# Check Cilium pods
docker exec cka-a-1-control-plane kubectl get pods -n kube-system -l k8s-app=cilium

# Check Cilium status
docker exec cka-a-1-control-plane cilium status

# Reinstall Cilium
docker exec cka-a-1-control-plane cilium uninstall
docker exec cka-a-1-control-plane cilium install --wait
```

## Differences from KIND CLI

| Feature | KIND CLI | Docker Compose |
|---------|----------|----------------|
| Cluster creation | `kind create cluster` | `docker-compose up` + `init-compose-cluster.sh` |
| Node containers | Managed by KIND | Explicitly defined in docker-compose.yml |
| Networking | KIND creates network | Defined in docker-compose networks |
| Kubeconfig | Auto-merged to ~/.kube/config | Exported to /tmp/{cluster}-kubeconfig |
| CNI | Kindnet (default) | Cilium (installed by init script) |
| Cleanup | `kind delete cluster` | `docker-compose down` |

## Advantages of Docker Compose Approach

1. **Explicit node definitions** - See exactly what containers are running
2. **Network control** - Custom subnet per cluster
3. **Port mapping** - Easy to expose specific ports
4. **Resource limits** - Can add CPU/memory limits per service
5. **Multiple clusters** - Run many clusters independently
6. **No KIND dependency** - Just Docker and docker-compose needed

## Next Steps

1. Practice CKA/CKAD tasks on the clusters
2. Deploy bastion pods for SSH access
3. Add more cluster scenarios in docker-compose.new.yml
4. Customize node resources and configurations
