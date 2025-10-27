# K3s Web Terminal

An Express webserver that provides a WebSocket-based terminal interface to an Ubuntu container with k3s (lightweight Kubernetes) installed. Perfect for interactive Kubernetes practice and learning.

## Features

- Interactive web-based terminal interface
- WebSocket-based terminal using node-pty
- Full bash shell access to Ubuntu container with k3s
- HTTP endpoints for practice questions and answer validation
- Docker containerized with k3s pre-installed
- Mock practice questions for Kubernetes learning
- Built-in web client for easy access

## Prerequisites

- Docker
- Docker Compose (optional, but recommended)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### Using Docker

```bash
# Build the image
docker build -t k3s-web-terminal .

# Run the container
docker run -d \
  --name k3s-web-terminal \
  --privileged \
  -p 3000:3000 \
  -v k3s-data:/var/lib/rancher/k3s \
  k3s-web-terminal
```

## Using the Web Client

Once the container is running, open your browser and navigate to:

```
http://localhost:3000
```

The web interface provides:
- An interactive terminal on the right side
- Practice questions on the left side
- Ability to submit and check answers
- Solution hints for each question

## API Endpoints

### GET /

Serves the web client interface

```bash
# Access via browser
http://localhost:3000
```

### GET /api

Health check and API information

```bash
curl http://localhost:3000/api
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

## WebSocket Connection

Connect to the WebSocket endpoint at `ws://localhost:3000` to access the terminal.

### Example WebSocket Client (Node.js)

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Connected to terminal');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);

  if (message.type === 'output') {
    process.stdout.write(message.data);
  } else if (message.type === 'connected') {
    console.log('Session ID:', message.sessionId);
  }
});

// Send input to the terminal
process.stdin.on('data', (data) => {
  ws.send(JSON.stringify({
    type: 'input',
    data: data.toString()
  }));
});
```

### WebSocket Message Types

#### From Client to Server

**Input:**
```json
{
  "type": "input",
  "data": "ls -la\n"
}
```

**Resize Terminal:**
```json
{
  "type": "resize",
  "cols": 120,
  "rows": 40
}
```

#### From Server to Client

**Output:**
```json
{
  "type": "output",
  "data": "terminal output here"
}
```

**Connected:**
```json
{
  "type": "connected",
  "message": "Connected to terminal",
  "sessionId": "1234567890"
}
```

**Exit:**
```json
{
  "type": "exit",
  "exitCode": 0,
  "signal": null
}
```

## File Structure

```
.
├── Dockerfile              # Ubuntu container with k3s
├── docker-compose.yml      # Docker Compose configuration
├── package.json           # Node.js dependencies
├── server.js              # Express server with WebSocket
├── is-correct.js          # Question validation logic
├── client.html            # Web-based terminal interface
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

Note: k3s will not be available in local development mode. You'll only have access to your host system's bash shell.

### Logs

View logs using Docker Compose:
```bash
docker-compose logs -f
```

Or with Docker:
```bash
docker logs -f k3s-web-terminal
```

## Troubleshooting

### k3s fails to start

Make sure you're running the container in privileged mode:
```bash
docker run --privileged ...
```

### WebSocket connection fails

Check that port 3000 is not already in use:
```bash
lsof -i :3000
```

### Container exits immediately

Check the logs:
```bash
docker-compose logs
```

## Security Notes

This container runs in privileged mode to support k3s. Only use this in development/learning environments, not in production.

## License

MIT
