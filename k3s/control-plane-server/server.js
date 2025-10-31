import express from 'express';
import { Server } from 'socket.io';
import { spawn } from 'node-pty';
import { createServer } from 'http';
import { KubeConfig, CoreV1Api, AppsV1Api } from '@kubernetes/client-node';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

const PORT = process.env.WS_PORT || 3000;

// Store active PTY sessions per socket
const terminals = {};
// Store cluster state per session
const clusterStates = {};

// Initialize Kubernetes client
const kc = new KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(CoreV1Api);
const k8sAppsApi = kc.makeApiClient(AppsV1Api);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Handle terminal creation
  socket.on('create-terminal', (data) => {
    const { sessionId } = data;
    console.log(`Creating terminal for session: ${sessionId}`);

    // Create a new PTY with tmux
    const ptyProcess = spawn('tmux', ['new-session', '-A', '-s', sessionId], {
      name: 'xterm-256color',
      cols: data.cols || 80,
      rows: data.rows || 24,
      cwd: process.env.HOME || '/root',
      env: process.env
    });

    terminals[socket.id] = ptyProcess;

    // Send data from PTY to client
    ptyProcess.onData((data) => {
      socket.emit('terminal-output', data);
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`PTY process exited: ${exitCode}, signal: ${signal}`);
      delete terminals[socket.id];
      socket.emit('terminal-exit', { exitCode, signal });
    });

    socket.emit('terminal-created', { sessionId });
  });

  // Handle terminal input
  socket.on('terminal-input', (data) => {
    const ptyProcess = terminals[socket.id];
    if (ptyProcess) {
      ptyProcess.write(data);
    }
  });

  // Handle terminal resize
  socket.on('terminal-resize', ({ cols, rows }) => {
    const ptyProcess = terminals[socket.id];
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
    }
  });

  // Handle cluster reset
  socket.on('reset-cluster', async (data) => {
    const { namespace = 'default', statefulSetName } = data;
    console.log(`Resetting cluster - namespace: ${namespace}, statefulSet: ${statefulSetName}`);

    try {
      socket.emit('cluster-status', { status: 'resetting', message: 'Deleting pods...' });

      // Delete pods from StatefulSet if specified
      if (statefulSetName) {
        const pods = await k8sApi.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, `app=${statefulSetName}`);

        for (const pod of pods.body.items) {
          await k8sApi.deleteNamespacedPod(pod.metadata.name, namespace);
          console.log(`Deleted pod: ${pod.metadata.name}`);
        }

        // Wait for pods to be recreated
        socket.emit('cluster-status', { status: 'resetting', message: 'Waiting for pods to respawn...' });
        await waitForStatefulSetReady(namespace, statefulSetName);
      } else {
        // Reset all pods in namespace
        const pods = await k8sApi.listNamespacedPod(namespace);
        for (const pod of pods.body.items) {
          if (!pod.metadata.name.startsWith('kube-')) {
            await k8sApi.deleteNamespacedPod(pod.metadata.name, namespace);
            console.log(`Deleted pod: ${pod.metadata.name}`);
          }
        }
      }

      socket.emit('cluster-status', { status: 'ready', message: 'Cluster reset complete' });
      socket.emit('cluster-reset-complete', { success: true });
    } catch (error) {
      console.error('Error resetting cluster:', error);
      socket.emit('cluster-status', { status: 'error', message: error.message });
      socket.emit('cluster-reset-complete', { success: false, error: error.message });
    }
  });

  // Handle manifest application
  socket.on('apply-manifests', async (data) => {
    const { manifests, sessionId } = data;
    console.log(`Applying manifests for session: ${sessionId}`);

    try {
      socket.emit('cluster-status', { status: 'configuring', message: 'Applying manifests...' });

      // Write manifests to a temporary file
      const manifestFile = `/tmp/manifest-${sessionId}-${Date.now()}.yaml`;
      await execAsync(`cat > ${manifestFile} <<'EOF'\n${manifests}\nEOF`);

      // Apply manifests using kubectl
      const { stdout, stderr } = await execAsync(`kubectl apply -f ${manifestFile}`);

      console.log('Manifests applied:', stdout);
      if (stderr) console.error('kubectl stderr:', stderr);

      // Clean up temp file
      await execAsync(`rm -f ${manifestFile}`);

      socket.emit('cluster-status', { status: 'ready', message: 'Manifests applied successfully' });
      socket.emit('manifests-applied', { success: true, output: stdout });
    } catch (error) {
      console.error('Error applying manifests:', error);
      socket.emit('cluster-status', { status: 'error', message: error.message });
      socket.emit('manifests-applied', { success: false, error: error.message });
    }
  });

  // Handle validation check
  socket.on('check-answer', async (data) => {
    const { validationCommand, sessionId } = data;
    console.log(`Checking answer for session: ${sessionId}`);

    try {
      // Execute validation command
      const { stdout, stderr } = await execAsync(validationCommand, {
        timeout: 30000 // 30 second timeout
      });

      // Parse output as JSON
      let result;
      try {
        result = JSON.parse(stdout);
      } catch (e) {
        // If not JSON, treat as raw output
        result = { output: stdout, rawOutput: true };
      }

      console.log('Validation result:', result);
      socket.emit('answer-checked', { success: true, result });
    } catch (error) {
      console.error('Error checking answer:', error);
      socket.emit('answer-checked', {
        success: false,
        result: {
          correct: false,
          error: error.message,
          stderr: error.stderr
        }
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    // Clean up terminal
    const ptyProcess = terminals[socket.id];
    if (ptyProcess) {
      ptyProcess.kill();
      delete terminals[socket.id];
    }

    // Clean up cluster state
    delete clusterStates[socket.id];
  });
});

// Helper function to wait for StatefulSet to be ready
async function waitForStatefulSetReady(namespace, name, timeoutMs = 300000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await k8sAppsApi.readNamespacedStatefulSet(name, namespace);
      const statefulSet = response.body;

      const ready = statefulSet.status.readyReplicas === statefulSet.spec.replicas;

      if (ready) {
        console.log(`StatefulSet ${name} is ready`);
        return true;
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error checking StatefulSet status:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  throw new Error(`StatefulSet ${name} did not become ready within ${timeoutMs}ms`);
}

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`K3s Control Plane WebSocket Server running on port ${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');

  // Kill all active terminals
  Object.values(terminals).forEach((ptyProcess) => {
    ptyProcess.kill();
  });

  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
