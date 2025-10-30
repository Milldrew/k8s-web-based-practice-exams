# Kubernetes Practice Exam Platform - SSH-Based Access

A scalable platform for running Kubernetes practice exams using KIND (Kubernetes in Docker) clusters with SSH-based access via bastion pods.

## Architecture

### Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Host                              │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  KIND Cluster: kind-cka-a-1                        │    │
│  │                                                     │    │
│  │  ┌─────────────────┐  ┌──────────┐  ┌──────────┐  │    │
│  │  │ Control-Plane   │  │ Worker 1 │  │ Worker 2 │  │    │
│  │  │  + SSH Server   │  │+ SSH Svr │  │+ SSH Svr │  │    │
│  │  └─────────────────┘  └──────────┘  └──────────┘  │    │
│  │                                                     │    │
│  │  ┌─────────────────────────────────────────────┐   │    │
│  │  │ SSH Bastion Pod (namespace: cka-a-1)        │   │    │
│  │  │ - kubectl configured                        │   │    │
│  │  │ - SSH keys to access all nodes              │   │    │
│  │  │ - Exposed via NodePort 30001                │   │    │
│  │  └─────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
    User: kubectl exec into bastion
          OR ssh -p 30001 localhost
```

### Key Features

1. **Proper KIND Clusters**: Each node is a separate container (no Docker-in-Docker)
2. **SSH Access**: All KIND nodes have SSH enabled with key-based auth
3. **Bastion Pod**: Lightweight Alpine-based pod with kubectl + SSH client
4. **Kustomize-Based**: Easy to scale with overlays per exam question
5. **Namespace Isolation**: Each scenario in its own namespace (e.g., `cka-a-1`)
6. **Multiple Cluster Types**: Single-node, multi-node, and HA configurations

## Quick Start

### Prerequisites

```bash
# Required
- Docker
- kubectl
- kind
- kustomize (or kubectl v1.14+)
- cilium CLI (optional, for CNI)

# Install KIND
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-$(uname)-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Install Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-$(uname | tr '[:upper:]' '[:lower:]')-amd64.tar.gz
tar xzvf cilium-$(uname | tr '[:upper:]' '[:lower:]')-amd64.tar.gz
sudo mv cilium /usr/local/bin/
```

### Local Testing with Docker Compose

```bash
# Start a single scenario
docker-compose -f docker-compose.new.yml up kind-cka-a-1

# Start multiple scenarios
docker-compose -f docker-compose.new.yml up kind-cka-a-1 kind-ckad-a-1

# Stop and clean up
docker-compose -f docker-compose.new.yml down -v
```

### Production Deployment (KIND on Host)

#### 1. Create a Cluster

```bash
cd k8s/scripts

# Create a multi-node cluster for CKA
./create-cluster.sh cka a 1 multi-node

# Create a single-node cluster for CKAD
./create-cluster.sh ckad a 1 single-node

# Create an HA cluster for advanced CKA scenarios
./create-cluster.sh cka b 1 ha-cluster
```

This script will:
- Create the KIND cluster
- Install Cilium CNI
- Enable SSH on all nodes
- Generate SSH keys at `/tmp/kind-ssh-key`

#### 2. Deploy the Scenario

```bash
# Deploy SSH bastion pod
./deploy-scenario.sh cka a 1
```

This script will:
- Create the namespace
- Create SSH key secrets
- Deploy the bastion pod
- Expose it via NodePort

#### 3. Access the Cluster

```bash
# Option 1: Exec into bastion pod
kubectl exec -it -n cka-a-1 deployment/cka-a-1-ssh-bastion -- /bin/bash

# Option 2: SSH to bastion (if NodePort accessible)
ssh -p 30001 root@localhost

# Once in bastion, SSH to any node
ssh kind-cka-a-1-control-plane
ssh kind-cka-a-1-worker
ssh kind-cka-a-1-worker2
```

#### 4. Clean Up

```bash
# Delete the cluster
./delete-cluster.sh cka a 1
```

## Directory Structure

```
.
├── k8s/
│   ├── base/
│   │   ├── kind-configs/          # Cluster topology definitions
│   │   │   ├── single-node.yaml
│   │   │   ├── multi-node.yaml
│   │   │   └── ha-cluster.yaml
│   │   └── ssh-bastion/           # Base Kubernetes manifests
│   │       ├── namespace.yaml
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       ├── configmap.yaml
│   │       └── kustomization.yaml
│   ├── overlays/                  # Per-scenario overlays
│   │   ├── cka/
│   │   │   ├── a-1/              # Namespace: cka-a-1, Port: 30001
│   │   │   ├── a-2/              # Namespace: cka-a-2, Port: 30002
│   │   │   └── b-1/              # Namespace: cka-b-1, Port: 30003
│   │   ├── ckad/
│   │   │   ├── a-1/              # Namespace: ckad-a-1, Port: 30101
│   │   │   └── a-2/              # Namespace: ckad-a-2, Port: 30102
│   │   └── cks/
│   │       └── a-1/              # Namespace: cks-a-1, Port: 30201
│   └── scripts/
│       ├── create-cluster.sh     # Create KIND cluster
│       ├── delete-cluster.sh     # Delete cluster
│       ├── deploy-scenario.sh    # Deploy bastion pod
│       ├── setup-ssh.sh          # Enable SSH on nodes
│       ├── list-scenarios.sh     # List available scenarios
│       └── build-image.sh        # Build bastion image
├── Dockerfile.bastion            # Bastion pod image
└── docker-compose.new.yml        # Local testing setup
```

## Configuration

### Naming Conventions

| Item | Pattern | Example |
|------|---------|---------|
| Cluster | `kind-{exam}-{set}-{question}` | `kind-cka-a-1` |
| Namespace | `{exam}-{set}-{question}` | `cka-a-1` |
| Bastion Deployment | `{exam}-{set}-{question}-ssh-bastion` | `cka-a-1-ssh-bastion` |
| NodePort | `300{XX}` for CKA<br>`301{XX}` for CKAD<br>`302{XX}` for CKS | `30001`<br>`30101`<br>`30201` |

### Cluster Types

| Type | Topology | Use Cases |
|------|----------|-----------|
| `single-node` | 1 control-plane | CKAD, basic scenarios |
| `multi-node` | 1 control-plane + 2 workers | CKA, most scenarios |
| `ha-cluster` | 3 control-planes + 2 workers | CKA HA topics, etcd backups |

### Port Assignments

#### Bastion NodePorts

```
CKA:  30001-30099
CKAD: 30101-30199
CKS:  30201-30299
```

#### API Server Ports (for Docker Compose)

```
kind-cka-a-1:   6443
kind-cka-a-2:   6444
kind-ckad-a-1:  6445
```

## Usage Examples

### Example 1: CKA Practice - Deployment Task

```bash
# Create cluster
cd k8s/scripts
./create-cluster.sh cka a 1 multi-node

# Deploy bastion
./deploy-scenario.sh cka a 1

# Access bastion
kubectl exec -it -n cka-a-1 deployment/cka-a-1-ssh-bastion -- /bin/bash

# Inside bastion, work on the task
kubectl create deployment nginx-deployment --image=nginx:1.14.2 --replicas=3
kubectl get deployments
```

### Example 2: Multiple Concurrent Scenarios

```bash
# Create multiple clusters
./create-cluster.sh cka a 1 multi-node
./create-cluster.sh cka a 2 multi-node
./create-cluster.sh ckad a 1 single-node

# Deploy all scenarios
./deploy-scenario.sh cka a 1
./deploy-scenario.sh cka a 2
./deploy-scenario.sh ckad a 1

# Each accessible on different ports
# cka-a-1:  kubectl -n cka-a-1 ...
# cka-a-2:  kubectl -n cka-a-2 ...
# ckad-a-1: kubectl -n ckad-a-1 ...
```

### Example 3: SSH Directly to Nodes

```bash
# From bastion pod
kubectl exec -it -n cka-a-1 deployment/cka-a-1-ssh-bastion -- /bin/bash

# SSH to control-plane
ssh kind-cka-a-1-control-plane

# SSH to worker
ssh kind-cka-a-1-worker

# Check etcd (CKA task)
ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  member list
```

## Building Custom Bastion Image

```bash
cd k8s/scripts

# Build locally
./build-image.sh

# Build and push to registry
IMAGE_NAME="your-registry.com/ssh-bastion" IMAGE_TAG="v1.0" ./build-image.sh push

# Update image in k8s/base/ssh-bastion/deployment.yaml
```

## Troubleshooting

### Cluster Won't Create

```bash
# Check Docker is running
docker ps

# Check KIND version
kind version

# Delete and recreate
kind delete cluster --name kind-cka-a-1
./create-cluster.sh cka a 1 multi-node
```

### SSH Not Working

```bash
# Check SSH keys exist
ls -la /tmp/kind-ssh-key*

# Recreate SSH setup
./setup-ssh.sh kind-cka-a-1

# Test SSH from Docker host
NODE_IP=$(docker inspect kind-cka-a-1-control-plane --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
ssh -i /tmp/kind-ssh-key root@$NODE_IP
```

### Bastion Pod Not Starting

```bash
# Check secret exists
kubectl get secret ssh-keys -n cka-a-1

# Recreate secret
kubectl delete secret ssh-keys -n cka-a-1
kubectl create secret generic ssh-keys \
  --from-file=id_rsa=/tmp/kind-ssh-key \
  --from-file=id_rsa.pub=/tmp/kind-ssh-key.pub \
  -n cka-a-1

# Check pod logs
kubectl logs -n cka-a-1 -l app=ssh-bastion
```

### Cilium Issues

```bash
# Check Cilium status
cilium status --context kind-cka-a-1

# Reinstall if needed
cilium uninstall --context kind-cka-a-1
cilium install --context kind-cka-a-1 --wait
```

## Adding New Scenarios

### 1. Create Overlay Directory

```bash
mkdir -p k8s/overlays/cka/c-1
```

### 2. Create `kustomization.yaml`

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: cka-c-1

bases:
  - ../../../base/ssh-bastion

namePrefix: cka-c-1-

commonLabels:
  exam-type: cka
  exam-set: c
  question-number: "1"

patches:
  - patch: |-
      - op: replace
        path: /metadata/name
        value: cka-c-1
    target:
      kind: Namespace
  - patch: |-
      - op: replace
        path: /spec/ports/0/nodePort
        value: 30004
    target:
      kind: Service
      name: ssh-bastion
  - patch: |-
      - op: replace
        path: /data/CLUSTER_NAME
        value: kind-cka-c-1
      - op: replace
        path: /data/EXAM_TYPE
        value: cka
      - op: replace
        path: /data/CLUSTER_TYPE
        value: multi-node
    target:
      kind: ConfigMap
      name: cluster-config
```

### 3. Deploy

```bash
./create-cluster.sh cka c 1 multi-node
./deploy-scenario.sh cka c 1
```

## Migration from Old Architecture

See [MIGRATION.md](k8s/MIGRATION.md) for details on migrating from the old Docker-in-Docker / WebSocket architecture.

## Security Notes

- SSH keys are generated automatically and stored in `/tmp/kind-ssh-key`
- Keys are mounted as Kubernetes secrets in bastion pods
- Default SSH password is `kubernetes` (use keys instead)
- Bastion pods run with `hostNetwork: true` for node access
- This is for practice/learning environments only - not production

## Performance

### Resource Usage (per scenario)

- Control-plane node: ~500MB RAM
- Worker node: ~300MB RAM
- Bastion pod: 64-128MB RAM
- Total per multi-node scenario: ~1.5GB RAM

### Scaling

- Can run 10+ scenarios on a machine with 16GB RAM
- Each scenario is isolated in its own namespace
- Cleanup is simple: `kind delete cluster --name <cluster>`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add new scenarios in `k8s/overlays/`
4. Test with `create-cluster.sh` and `deploy-scenario.sh`
5. Submit a pull request

## License

MIT License - See LICENSE file for details
