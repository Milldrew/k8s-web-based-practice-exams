import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import cors from 'cors';
import { join } from 'node:path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const httpServer = createServer(app);
const angularApp = new AngularNodeAppEngine();

// Create Socket.IO server for client connections
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:4000'],
    credentials: true
  },
  path: '/socket.io/'
});

/**
 * Enable CORS for API requests
 */
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:4000'],
  credentials: true
}));

/**
 * API Endpoints
 */

// Store active k3s connections per session
const k3sConnections: Record<string, { k3sSocket: ClientSocket; sessionId: string }> = {};

// Get K3s WebSocket URL from environment or default
const K3S_WS_URL = process.env['K3S_WS_URL'] || 'http://172.28.0.10:3000';

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket Proxy to K3s Control Plane
io.on('connection', (clientSocket) => {
  console.log(`Client connected: ${clientSocket.id}`);

  let k3sSocket: ClientSocket | null = null;

  // Connect to K3s control plane on first terminal request
  clientSocket.on('connect-to-k3s', (data: { sessionId: string }) => {
    const { sessionId } = data;
    console.log(`Connecting to K3s for session: ${sessionId}`);

    // Create connection to k3s control plane
    k3sSocket = ioClient(K3S_WS_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    k3sConnections[clientSocket.id] = { k3sSocket, sessionId };

    // Forward connection events
    k3sSocket.on('connect', () => {
      console.log(`Connected to K3s control plane for session: ${sessionId}`);
      clientSocket.emit('k3s-connected', { sessionId });
    });

    k3sSocket.on('disconnect', () => {
      console.log(`Disconnected from K3s for session: ${sessionId}`);
      clientSocket.emit('k3s-disconnected', { sessionId });
    });

    k3sSocket.on('connect_error', (error) => {
      console.error(`K3s connection error:`, error);
      clientSocket.emit('k3s-error', { error: error.message });
    });

    // Forward all k3s events to client
    k3sSocket.onAny((eventName, ...args) => {
      clientSocket.emit(eventName, ...args);
    });
  });

  // Forward client events to k3s
  clientSocket.on('create-terminal', (data: any) => {
    if (k3sSocket) k3sSocket.emit('create-terminal', data);
  });

  clientSocket.on('terminal-input', (data: any) => {
    if (k3sSocket) k3sSocket.emit('terminal-input', data);
  });

  clientSocket.on('terminal-resize', (data: any) => {
    if (k3sSocket) k3sSocket.emit('terminal-resize', data);
  });

  clientSocket.on('reset-cluster', (data: any) => {
    if (k3sSocket) k3sSocket.emit('reset-cluster', data);
  });

  clientSocket.on('apply-manifests', (data: any) => {
    if (k3sSocket) k3sSocket.emit('apply-manifests', data);
  });

  clientSocket.on('check-answer', (data: any) => {
    if (k3sSocket) k3sSocket.emit('check-answer', data);
  });

  // Handle client disconnect
  clientSocket.on('disconnect', () => {
    console.log(`Client disconnected: ${clientSocket.id}`);
    const connection = k3sConnections[clientSocket.id];
    if (connection && connection.k3sSocket) {
      connection.k3sSocket.disconnect();
    }
    delete k3sConnections[clientSocket.id];
  });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  httpServer.listen(port, (error?: Error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server with Socket.IO listening on http://localhost:${port}`);
    console.log(`K3s WebSocket URL: ${K3S_WS_URL}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
