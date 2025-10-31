# Quick Start Guide

## Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ and npm installed
- 4GB+ RAM available for K3s cluster

## Step-by-Step Setup

### 1. Verify Setup
```bash
./verify-setup.sh
```

### 2. Install K3s Control Plane Dependencies
```bash
cd k3s/control-plane-server
npm install
cd ../..
```

### 3. Build K3s Custom Image
```bash
cd k3s
./build.sh
```

**Note**: This builds a custom K3s image with:
- Node.js + npm
- vim + tmux
- WebSocket server for terminal access
- SSH server

### 4. Start K3s Cluster
```bash
docker-compose up -d
```

Wait ~30 seconds for initialization. Check status:
```bash
docker logs k3s-server
```

You should see:
```
K3s Control Plane WebSocket Server running on port 3000
```

### 5. Install Angular Dependencies
```bash
cd ../angualr-k8s.milldrew.com
npm install
```

### 6. Build Angular Application
```bash
npm run build
```

### 7. Start Angular SSR Server
```bash
npm run serve:ssr:angualr-k8s.milldrew.com
```

You should see:
```
Node Express server with Socket.IO listening on http://localhost:4000
K3s WebSocket URL: http://172.28.0.10:3000
```

### 8. Access Application
Open browser to: **http://localhost:4000**

## Troubleshooting

### Docker build fails with "npm: not found"
The Dockerfile now installs npm directly. Make sure you're using the updated Dockerfile:
```bash
cd k3s
# Rebuild image
docker-compose build --no-cache k3s-server
```

### Can't connect to K3s WebSocket
Check the K3s server is running and WebSocket server started:
```bash
docker logs k3s-server | grep -i websocket
# Should show: K3s Control Plane WebSocket Server running on port 3000
```

### Terminal not appearing
1. Check browser console for errors (F12)
2. Verify WebSocket connection in Network tab
3. Check Angular SSR server logs

### Cluster reset hangs
```bash
# Restart K3s
docker-compose restart k3s-server

# Or rebuild completely
docker-compose down
docker-compose up -d
```

### TypeScript errors in Angular build
The server.ts file is now properly typed. If you see errors:
```bash
cd angualr-k8s.milldrew.com
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Development Mode

For Angular development with hot reload:
```bash
cd angualr-k8s.milldrew.com
npm start
```

Access at: **http://localhost:4200**

**Note**: In dev mode, update the WebSocket URL in `websocket.service.ts` if needed.

## Stopping Services

### Stop K3s Cluster
```bash
cd k3s
docker-compose down
```

### Stop Angular SSR
Press `Ctrl+C` in the terminal running the SSR server

## Clean Rebuild

If you need to completely rebuild:
```bash
# Stop and remove K3s
cd k3s
docker-compose down -v
docker rmi k3s-k3s-server

# Rebuild
./build.sh
docker-compose up -d

# Rebuild Angular
cd ../angualr-k8s.milldrew.com
rm -rf dist node_modules
npm install
npm run build
npm run serve:ssr:angualr-k8s.milldrew.com
```

## Architecture Summary

```
Browser (http://localhost:4200 or 4000)
    ↓ Socket.IO Client
Angular SSR Server (port 4000)
    ↓ Socket.IO Proxy
K3s Control Plane WebSocket Server (port 3000)
    ↓ node-pty + kubectl
K3s Cluster (K8s API on port 6443)
```

## Sample Exam Flow

1. Select exam (CKA/CKS/CKAD)
2. Start exam → Creates session
3. For each question:
   - **BEFORE**: Cluster resets, manifests applied
   - **DURING**: Terminal access, work on question
   - **Check Answer**: Validation runs
   - **AFTER**: See result, move to next
4. Complete exam → View results dashboard

## Default Exam Data

Sample questions are in `exam-data.service.ts`:
- **CKA Practice Exam 1**: 5 questions
- **CKS Practice Exam 1**: 1 question
- **CKAD Practice Exam 1**: 1 question

Edit this file to add more questions.

## Ports Used

- **3000**: K3s WebSocket server
- **4000**: Angular SSR server (production)
- **4200**: Angular dev server (development)
- **6443**: Kubernetes API
- **22**: SSH (in K3s container)

## Security Warning

⚠️ **This is for educational/practice use only!**

- No authentication
- Insecure SSH configuration
- No SSL/TLS
- Root access to K3s
- Not suitable for production or public internet

## Next Steps

1. Customize exam questions in `exam-data.service.ts`
2. Add routes for exam selection in Angular
3. Style the UI to match your design
4. Add user authentication when ready for production
5. Consider adding more CKA/CKS/CKAD questions

Enjoy your K8s practice exams! 🚀
