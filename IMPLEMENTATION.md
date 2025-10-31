# K8s Web-Based Practice Exams - Implementation Guide

## System Overview

This is a comprehensive web-based Kubernetes practice exam system that provisions individual K3s clusters for students, provides a terminal interface, and automatically validates their work.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Angular SPA)                     │
│  - xterm.js Terminal                                         │
│  - Question UI                                               │
│  - Exam Results Dashboard                                    │
│  - SessionStorage for exam data                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ Socket.IO Client
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            Angular SSR Server (Express + Socket.IO)          │
│  - WebSocket Proxy                                           │
│  - Forwards terminal I/O                                     │
│  - Forwards cluster commands                                 │
│  Port: 4000                                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Socket.IO Client
                       ▼
┌─────────────────────────────────────────────────────────────┐
│       K3s Control Plane (Custom Docker Image)                │
│  - Node.js WebSocket Server (port 3000)                      │
│  - node-pty for terminal sessions                            │
│  - kubectl access                                            │
│  - tmux + vim installed                                      │
│  - Kubernetes API (port 6443)                                │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    K3s Agent Nodes                           │
│  - Worker nodes for pod execution                            │
└─────────────────────────────────────────────────────────────┘
```

## Question Lifecycle

### BEFORE Phase
1. **Cluster Reset**: Delete all non-system pods
2. **Wait for Ready**: Ensure cluster is healthy
3. **Apply Manifests**: Deploy question-specific resources (if any)
4. **Transition to DURING**: Enable terminal and question UI

### DURING Phase
1. **Terminal Access**: Student can use kubectl, tmux, vim
2. **Show Solution**: Optional solution display
3. **Check Answer**: Validate work via validation command
4. **Transition to AFTER**: Display results

### AFTER Phase
1. **Show Result**: ✓ or ✗ with message
2. **Record Answer**: Save to session storage
3. **Navigate**: Move to next question or finish exam

## Directory Structure

```
k8s-web-based-practice-exams/
├── k3s/                              # K3s cluster configuration
│   ├── Dockerfile.k3s-server         # Control plane with Node.js + websocket
│   ├── docker-compose.yml            # K3s cluster setup
│   ├── control-plane-server/         # WebSocket server for control plane
│   │   ├── package.json
│   │   └── server.js                 # Socket.IO + node-pty + kubectl
│   └── kubeconfig/                   # Generated kubeconfig files
│
└── angualr-k8s.milldrew.com/         # Angular SSR application
    ├── src/
    │   ├── server.ts                 # SSR server with Socket.IO proxy
    │   ├── app/
    │   │   ├── services/
    │   │   │   ├── websocket.service.ts          # Socket.IO client wrapper
    │   │   │   ├── cluster.service.ts            # Cluster management API
    │   │   │   ├── exam-data.service.ts          # Mock exam data + storage
    │   │   │   └── question-lifecycle.service.ts # Lifecycle orchestration
    │   │   └── components/
    │   │       ├── terminal/                     # xterm.js terminal
    │   │       ├── exam-session/                 # Main exam UI
    │   │       └── exam-results/                 # Results dashboard
    │   └── ...
    └── ...
```

## Key Components

### 1. K3s Control Plane Server (`k3s/control-plane-server/server.js`)

**Features:**
- Socket.IO server on port 3000
- node-pty for terminal sessions with tmux
- Kubernetes client integration
- Cluster reset functionality
- Manifest application
- Answer validation via kubectl

**Events:**
- `create-terminal`: Create new PTY session
- `terminal-input`: Forward input to PTY
- `terminal-resize`: Resize PTY
- `reset-cluster`: Delete pods and wait for ready
- `apply-manifests`: kubectl apply resources
- `check-answer`: Run validation command

### 2. Angular SSR Server (`angualr-k8s.milldrew.com/src/server.ts`)

**Features:**
- Express server with Socket.IO
- Full-duplex proxy between browser and K3s
- Forwards all events bidirectionally
- Environment variable for K3s URL (default: `http://172.28.0.10:3000`)

**Configuration:**
```bash
export K3S_WS_URL=http://172.28.0.10:3000
```

### 3. WebSocket Service (`websocket.service.ts`)

Manages Socket.IO client connection to SSR server.

**Methods:**
- `connect()`: Connect to SSR WebSocket
- `connectToK3s(sessionId)`: Initiate K3s connection
- `emit(event, data)`: Send event to server
- `on<T>(event)`: Subscribe to server events

### 4. Cluster Service (`cluster.service.ts`)

High-level cluster management API.

**Methods:**
- `getClusterStatus()`: Observable of cluster status
- `resetCluster(options)`: Reset cluster pods
- `applyManifests(options)`: Apply YAML manifests
- `checkAnswer(command, sessionId)`: Validate student work

### 5. Exam Data Service (`exam-data.service.ts`)

Mock exam data with session storage persistence.

**Features:**
- Predefined exams (CKA, CKS, CKAD)
- Questions with validation commands
- Session storage for attempts and answers
- Score calculation
- Exam history

**Data Model:**
```typescript
interface Question {
  id: number;
  questionNumber: number;
  questionText: string;
  solution: string;
  validationCommand: string;  // Shell command returning JSON
  manifests?: string;         // Optional YAML to apply
  points: number;
}

interface ExamAttempt {
  sessionId: string;
  examId: number;
  startedAt: Date;
  completedAt?: Date;
  currentQuestionIndex: number;
  answers: QuestionAnswer[];
  totalScore: number;
  maxScore: number;
  status: 'in_progress' | 'completed';
}
```

### 6. Question Lifecycle Service (`question-lifecycle.service.ts`)

Orchestrates the BEFORE → DURING → AFTER question flow.

**Methods:**
- `prepareQuestion(question)`: Execute BEFORE phase
- `checkAnswer()`: Execute validation and transition to AFTER
- `moveToNextQuestion()`: Reset to BEFORE for next question
- `canUseTerminal()`: Check if terminal is enabled
- `canCheckAnswer()`: Check if validation is allowed
- `canProceedToNext()`: Check if can move to next question

### 7. Terminal Component (`terminal/terminal.component.ts`)

xterm.js integration with Socket.IO.

**Features:**
- Full-featured terminal emulator
- Auto-resize on window changes
- Bidirectional I/O with K3s
- Terminal status indicators

### 8. Exam Session Component (`exam-session/exam-session.component.ts`)

Main exam-taking interface.

**Features:**
- Question display
- Solution toggle
- Lifecycle status display
- Check answer button
- Navigation controls
- Question progress grid
- Integrated terminal panel

### 9. Exam Results Component (`exam-results/exam-results.component.ts`)

Results dashboard with history.

**Features:**
- Latest exam results
- Pass/Fail status (70% threshold)
- Score and percentage
- Incorrect questions list
- Full exam history
- Retake functionality
- Clear history option

## Building and Running

### 1. Build K3s Control Plane Image

```bash
cd k3s
./build.sh
```

This builds the custom K3s image with Node.js, tmux, vim, and the WebSocket server.

### 2. Start K3s Cluster

```bash
cd k3s
docker-compose up -d
```

Wait ~30 seconds for the cluster to initialize.

### 3. Install Angular Dependencies

```bash
cd angualr-k8s.milldrew.com
npm install
```

### 4. Build and Run Angular SSR Server

```bash
npm run build
npm run serve:ssr:angualr-k8s.milldrew.com
```

Or for development:
```bash
npm run start
```

### 5. Access Application

Open browser to: `http://localhost:4000`

## Environment Variables

### Angular SSR Server
```bash
PORT=4000                              # SSR server port
K3S_WS_URL=http://172.28.0.10:3000    # K3s WebSocket URL
```

### K3s Control Plane
```bash
WS_PORT=3000                          # WebSocket server port
K3S_TOKEN=mysecrettoken               # K3s cluster token
```

## Validation Commands

Validation commands must return JSON with at least a `correct` field:

```bash
# Example validation command
kubectl get deployment nginx-deploy -o json 2>/dev/null | \
  jq -e '.spec.replicas == 3' && \
  echo '{"correct": true, "message": "Deployment configured correctly"}' || \
  echo '{"correct": false, "message": "Deployment not found or incorrect"}'
```

## Adding New Questions

Edit `exam-data.service.ts`:

```typescript
{
  id: 6,
  questionNumber: 6,
  questionText: 'Create a secret named "db-secret" with username=admin and password=secret123',
  solution: 'kubectl create secret generic db-secret --from-literal=username=admin --from-literal=password=secret123',
  validationCommand: 'kubectl get secret db-secret -o json 2>/dev/null | jq -e \'.data.username | @base64d == "admin"\' && echo \'{"correct": true}\' || echo \'{"correct": false}\'',
  points: 1
}
```

## Security Notes

⚠️ **This is for practice/learning environments only!**

- No authentication on K3s control plane
- Root SSH access with empty password (in commented code)
- No SSL/TLS encryption
- No user authentication on Angular app
- Direct kubectl access from browser

## Future Enhancements

1. **User Authentication**: Add PostgreSQL + JWT authentication
2. **Multiple Clusters**: Provision one cluster per exam session
3. **Resource Limits**: Set CPU/memory limits per student
4. **Time Limits**: Add exam time constraints
5. **Question Randomization**: Randomize question order
6. **Detailed Analytics**: Track time per question, attempts, etc.
7. **Admin Dashboard**: Manage exams, questions, users
8. **SSL/TLS**: Secure all connections
9. **Cluster Cleanup**: Auto-delete clusters after exam completion

## Troubleshooting

### Terminal not connecting
- Check K3s server is running: `docker ps`
- Check WebSocket server logs: `docker logs k3s-server`
- Verify network: `docker network inspect k3s_k3s-network`

### Validation failing
- Test validation command directly in terminal
- Check kubectl access: `kubectl get nodes`
- Verify JSON output format

### Cluster reset hanging
- Check pod status: `kubectl get pods --all-namespaces`
- Restart K3s: `docker-compose restart k3s-server`

## License

Educational use only. Not for production deployment.
