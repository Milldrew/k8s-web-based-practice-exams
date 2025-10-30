# k3s Docker Compose Cluster

A lightweight Kubernetes (k3s) cluster running in Docker containers.

## Cluster Configuration

- **1 Server Node**: k3s-server (172.28.0.10)
- **2 Agent Nodes**: k3s-agent-1 (172.28.0.11), k3s-agent-2 (172.28.0.12)

## Quick Start

### Start the cluster
```bash
docker-compose up -d
```

### Stop the cluster
```bash
docker-compose down
```

### Stop and remove volumes
```bash
docker-compose down -v
```

## Access the Cluster

The kubeconfig file will be automatically generated in the `./kubeconfig` directory.

### Using kubectl

```bash
export KUBECONFIG=$(pwd)/kubeconfig/kubeconfig.yaml
kubectl get nodes
```

You should see 3 nodes:
- k3s-server (control-plane)
- k3s-agent-1 (worker)
- k3s-agent-2 (worker)

## Exposed Ports

- **6443**: Kubernetes API Server
- **80**: HTTP Ingress
- **443**: HTTPS Ingress

## Verify Cluster Status

```bash
# Check all containers are running
docker-compose ps

# View server logs
docker-compose logs k3s-server

# View agent logs
docker-compose logs k3s-agent-1
docker-compose logs k3s-agent-2

# Get cluster info
kubectl cluster-info

# Check node status
kubectl get nodes -o wide
```

## Configuration

You can modify the `K3S_TOKEN` in the `.env` file to change the cluster join token.

## Troubleshooting

If nodes are not joining:
1. Check logs: `docker-compose logs`
2. Ensure all containers are running: `docker-compose ps`
3. Restart the cluster: `docker-compose restart`

If kubeconfig is not generated:
1. Wait a few seconds for the server to initialize
2. Check server logs: `docker-compose logs k3s-server`
3. Verify the `./kubeconfig` directory exists and has proper permissions
