# Kind Web Terminal - WebSocket API

An Express webserver that provides a WebSocket-based terminal interface to an Ubuntu container with Kind (Kubernetes in Docker) installed. Perfect for interactive Kubernetes practice and learning with fully functional pods.

## Features

- WebSocket-based terminal using node-pty
- Full bash shell access to Ubuntu container with Kind
- **Fully functional Kubernetes cluster with working pods**
- HTTP endpoints for practice questions and answer validation
- Docker containerized with Kind pre-installed
- Mock practice questions for Kubernetes learning
- Standalone WebSocket client for terminal access

## Prerequisites

- Docker
- Docker Compose (optional, but recommended)
- Node.js (for running the WebSocket client locally)

## Quick Start

### 1. Start the Container

#### Using Docker Compose (Recommended)

```bash
# Build and start the container
docker compose up --build

# Or run in detached mode
docker compose up -d --build
```

#### Using Docker

```bash
# Build the image
docker build -t kind-web-terminal .

# Run the container
docker run -d \
  --name kind-web-terminal \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v kind-data:/root/.kube \
  kind-web-terminal
```

### 2. Connect to the Terminal

#### Using the Provided WebSocket Client

```bash
# Install dependencies (if not already done)
npm install

# Connect to the terminal
node client.js

# Or with custom URL
WS_URL=ws://localhost:3000 node client.js
```

The WebSocket client provides:
- Full interactive terminal access
- Direct keyboard input
- Real-time output
- Ctrl+C to exit

#### Using Your Own WebSocket Client

Connect to `ws://localhost:3000` and use the following message format:

**Send input to terminal:**
```json
{
  "type": "input",
  "data": "ls -la\n"
}
```

**Resize terminal:**
```json
{
  "type": "resize",
  "cols": 120,
  "rows": 40
}
```

**Receive output from terminal:**
```json
{
  "type": "output",
  "data": "terminal output here"
}
```

**Connection confirmation:**
```json
{
  "type": "connected",
  "message": "Connected to terminal",
  "sessionId": "1234567890"
}
```

**Terminal exit:**
```json
{
  "type": "exit",
  "exitCode": 0,
  "signal": null
}
```

## HTTP API Endpoints

### GET /

Health check and API information

```bash
curl http://localhost:3000/
```

Response:
```json
{
  "status": "running",
  "message": "Kind Web Terminal Server - WebSocket API",
  "endpoints": {
    "websocket": "ws://localhost:3000",
    "question": "GET /question",
    "isCorrect": "POST /is-correct",
    "reset": "POST /reset"
  }
}
```

### GET /question

Get the current practice question

```bash
curl http://localhost:3000/question
```

Response:
```json
{
  "id": 1,
  "question": "Create a pod named nginx-pod using the nginx image",
  "solution": "kubectl run nginx-pod --image=nginx"
}
```

### POST /is-correct

Check if the submitted answer is correct

```bash
curl -X POST http://localhost:3000/is-correct \
  -H "Content-Type: application/json" \
  -d '{"answer": "kubectl run nginx-pod --image=nginx"}'
```

Response:
```json
{
  "correct": true,
  "message": "Correct! Moving to next question."
}
```

### POST /reset

Reset questions to the beginning

```bash
curl -X POST http://localhost:3000/reset
```

Response:
```json
{
  "message": "Questions reset successfully"
}
```

## File Structure

```
.
├── Dockerfile              # Ubuntu container with Kind
├── docker-compose.yml      # Docker Compose configuration
├── package.json           # Node.js dependencies
├── server.js              # Express server with WebSocket
├── client.js              # WebSocket terminal client
├── is-correct.js          # Question validation logic
└── README.md              # This file
```

## Development

### Local Development (without Docker)

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. In another terminal, connect with the client:
```bash
node client.js
```

Note: Kind will not be available in local development mode. You'll only have access to your host system's bash shell.

### Logs

View logs using Docker Compose:
```bash
docker compose logs -f
```

Or with Docker:
```bash
docker logs -f kind-web-terminal
```

## Example Usage

1. Start the container:
```bash
docker compose up -d
```

2. Connect to the terminal:
```bash
node client.js
```

3. Run kubectl commands inside the container:
```bash
kubectl get nodes
kubectl get pods -A
kubectl run test-pod --image=nginx
kubectl get pods
```

4. Get a practice question:
```bash
# In another terminal
curl http://localhost:3000/question
```

5. Submit your answer:
```bash
curl -X POST http://localhost:3000/is-correct \
  -H "Content-Type: application/json" \
  -d '{"answer": "kubectl run nginx-pod --image=nginx"}'
```

## WebSocket Client Examples

### Node.js Example

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Connected!');

  // Send a command
  ws.send(JSON.stringify({
    type: 'input',
    data: 'kubectl get nodes\n'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);

  if (message.type === 'output') {
    console.log(message.data);
  }
});
```

### Python Example

```python
import websocket
import json

def on_message(ws, message):
    data = json.loads(message)
    if data['type'] == 'output':
        print(data['data'], end='')

def on_open(ws):
    print("Connected!")
    ws.send(json.dumps({
        'type': 'input',
        'data': 'kubectl get nodes\n'
    }))

ws = websocket.WebSocketApp(
    'ws://localhost:3000',
    on_message=on_message,
    on_open=on_open
)

ws.run_forever()
```

## Troubleshooting

### Kind cluster fails to start

Make sure Docker is running on your host machine:
```bash
docker info
```

### WebSocket connection fails

Check that port 3000 is not already in use:
```bash
lsof -i :3000
```

### Container exits immediately

Check the logs:
```bash
docker compose logs
```

### Client won't connect

Make sure the container is running:
```bash
docker compose ps
```

And verify the server is listening:
```bash
curl http://localhost:3000/
```

### Permission denied accessing Docker socket

If you see "permission denied" errors when trying to access Docker, make sure the Docker socket has proper permissions:
```bash
# On Linux, you may need to add your user to the docker group
sudo usermod -aG docker $USER
```

### Pods not starting

Check the Kind cluster status:
```bash
docker exec kind-web-terminal kubectl get nodes
docker exec kind-web-terminal kubectl get pods -A
```

If the cluster isn't responding, try recreating it:
```bash
docker compose down -v
docker compose up --build
```

## Security Notes

This container requires access to the Docker socket to create Kind clusters. Only use this in development/learning environments, not in production.

## License

MIT
