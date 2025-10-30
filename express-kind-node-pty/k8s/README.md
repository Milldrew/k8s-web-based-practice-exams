# Kubernetes Practice Exam Infrastructure

This directory contains the infrastructure for running Kubernetes practice exams using KIND (Kubernetes in Docker) with proper multi-node clusters.

## Architecture Overview

### Design Principles

1. **Proper KIND Clusters**: Each node runs in its own container (no Docker-in-Docker)
2. **WebSocket Server on Control Plane**: Deployed as a DaemonSet on control-plane nodes
3. **Kustomize Structure**: Base configuration + overlays for each exam question
4. **Namespace per Question**: Isolated environments matching exam patterns (e.g., `cka-a-1`)
5. **Multiple Cluster Topologies**: Single-node, multi-node, and HA configurations

### Directory Structure

```
k8s/
├── base/
│   ├── kind-configs/           # KIND cluster configurations
│   │   ├── single-node.yaml    # Single control-plane node
│   │   ├── multi-node.yaml     # 1 control-plane + 2 workers
│   │   └── ha-cluster.yaml     # 3 control-planes + 2 workers
│   └── websocket-server/       # Base K8s manifests
│       ├── namespace.yaml
│       ├── daemonset.yaml
│       ├── service.yaml
│       └── kustomization.yaml
├── overlays/
│   ├── cka/                    # Certified Kubernetes Administrator
│   │   ├── a-1/                # Exam set A, question 1
│   │   ├── a-2/                # Exam set A, question 2
│   │   └── b-1/                # Exam set B, question 1
│   ├── ckad/                   # Certified Kubernetes Application Developer
│   │   ├── a-1/
│   │   └── a-2/
│   └── cks/                    # Certified Kubernetes Security Specialist
│       └── a-1/
└── scripts/                    # Management scripts
    ├── create-cluster.sh       # Create KIND cluster
    ├── deploy-scenario.sh      # Deploy exam scenario
    ├── delete-cluster.sh       # Delete cluster
    ├── list-scenarios.sh       # List available scenarios
    └── build-image.sh          # Build websocket server image
```

## Quick Start

### Prerequisites

- Docker
- kubectl
- kind
- kustomize (or kubectl v1.14+)
- cilium CLI

### 1. Create a Cluster

```bash
cd k8s/scripts
./create-cluster.sh cka a 1 multi-node
```

This creates a cluster named `kind-cka-a-1` with the multi-node topology.

**Cluster Types:**
- `single-node`: 1 control-plane (for CKAD scenarios)
- `multi-node`: 1 control-plane + 2 workers (default for CKA)
- `ha-cluster`: 3 control-planes + 2 workers (for CKA advanced scenarios)

### 2. Deploy the Scenario

```bash
./deploy-scenario.sh cka a 1
```

This deploys the websocket server and configures the namespace `cka-a-1`.

### 3. Connect via WebSocket

The server is exposed via NodePort. Check the output from deploy-scenario.sh for the WebSocket URL:

```
WebSocket URL: ws://localhost:30001
```

### 4. Clean Up

```bash
./delete-cluster.sh cka a 1
```

## Cluster Naming Convention

Clusters follow the pattern: `kind-{exam}-{set}-{question}`

Examples:
- `kind-cka-a-1` - CKA exam, set A, question 1
- `kind-ckad-a-2` - CKAD exam, set A, question 2
- `kind-cks-a-1` - CKS exam, set A, question 1

## Namespace Convention

Namespaces match the cluster identifier without the `kind-` prefix:
- `cka-a-1`
- `ckad-a-2`
- `cks-a-1`

## Port Mapping

Each scenario uses a unique NodePort:

### CKA Scenarios
- `cka-a-1`: 30001
- `cka-a-2`: 30002
- `cka-b-1`: 30003

### CKAD Scenarios
- `ckad-a-1`: 30101
- `ckad-a-2`: 30102

### CKS Scenarios
- `cks-a-1`: 30201

### SSH Ports (from kind-config)
- Control-plane: 2222
- Worker 1: 2223
- Worker 2: 2224

## Adding New Scenarios

### 1. Create Overlay Directory

```bash
mkdir -p k8s/overlays/cka/c-1
```

### 2. Create kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: cka-c-1

bases:
  - ../../../base/websocket-server

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
      name: websocket-server

configMapGenerator:
  - name: question-config
    literals:
      - CLUSTER_NAME=kind-cka-c-1
      - CLUSTER_TYPE=multi-node
      - QUESTION_ID=cka-c-1
      - QUESTION_TEXT=Your question text here
```

### 3. Create and Deploy

```bash
cd k8s/scripts
./create-cluster.sh cka c 1 multi-node
./deploy-scenario.sh cka c 1
```

## Building the WebSocket Server Image

```bash
cd k8s/scripts
./build-image.sh        # Build only
./build-image.sh push   # Build and push to registry
```

The image is defined in `Dockerfile.new` at the project root.

## Troubleshooting

### Check Cluster Status

```bash
kind get clusters
kubectl get nodes --context kind-cka-a-1
```

### Check WebSocket Server

```bash
kubectl get all -n cka-a-1
kubectl logs -n cka-a-1 -l app=websocket-server -f
```

### Test WebSocket Connection

```bash
# Using wscat
wscat -c ws://localhost:30001

# Or curl
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Host: localhost:30001" \
     -H "Origin: http://localhost:30001" \
     http://localhost:30001/
```

### Verify Kustomize Build

```bash
kubectl kustomize k8s/overlays/cka/a-1
```

### Debug Cilium

```bash
cilium status --context kind-cka-a-1
cilium connectivity test --context kind-cka-a-1
```

## Advanced Usage

### Running Multiple Scenarios Simultaneously

Each scenario uses a unique namespace and NodePort, so you can run multiple clusters:

```bash
# Create multiple clusters
./create-cluster.sh cka a 1 multi-node
./create-cluster.sh cka a 2 multi-node
./create-cluster.sh ckad a 1 single-node

# Deploy scenarios
./deploy-scenario.sh cka a 1   # ws://localhost:30001
./deploy-scenario.sh cka a 2   # ws://localhost:30002
./deploy-scenario.sh ckad a 1  # ws://localhost:30101
```

### Custom Image Registry

```bash
export IMAGE_NAME="your-registry.com/your-repo/websocket-server"
export IMAGE_TAG="v1.0.0"
./build-image.sh push
```

Then update the image in `k8s/base/websocket-server/daemonset.yaml`.

### Accessing Nodes via SSH

KIND nodes are accessible via SSH on mapped ports:

```bash
# From host machine
ssh -p 2222 root@localhost  # Control-plane
ssh -p 2223 root@localhost  # Worker 1
ssh -p 2224 root@localhost  # Worker 2

# Password: Set during cluster creation (default: kubernetes)
```

## Architecture Diagrams

### Single-Node Cluster
```
┌─────────────────────────────┐
│   kind-ckad-a-1-control-plane│
│                              │
│  ┌────────────────────────┐ │
│  │  WebSocket Server      │ │
│  │  (DaemonSet)           │ │
│  │  Port: 30101           │ │
│  └────────────────────────┘ │
│                              │
│  Kubernetes Components       │
└─────────────────────────────┘
         │
         ▼
   ws://localhost:30101
```

### Multi-Node Cluster
```
┌──────────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ kind-cka-a-1-control-plane│  │ kind-cka-a-1-    │  │ kind-cka-a-1-    │
│                          │  │ worker           │  │ worker2          │
│ ┌──────────────────────┐ │  │                  │  │                  │
│ │ WebSocket Server     │ │  │  Worker Pods     │  │  Worker Pods     │
│ │ (DaemonSet)          │ │  │                  │  │                  │
│ │ Port: 30001          │ │  │                  │  │                  │
│ └──────────────────────┘ │  │                  │  │                  │
│                          │  │                  │  │                  │
│ Kubernetes Components    │  │                  │  │                  │
└──────────────────────────┘  └──────────────────┘  └──────────────────┘
         │                           │                       │
         └───────────────────────────┴───────────────────────┘
                                     │
                                     ▼
                            ws://localhost:30001
```

## Next Steps

1. Configure your frontend application to connect to the WebSocket URLs
2. Implement question validation logic in `is-correct.js`
3. Add more exam scenarios in the overlays directory
4. Consider adding automatic cleanup scripts for expired sessions
5. Implement user authentication and session management
