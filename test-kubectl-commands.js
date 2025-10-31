const io = require('socket.io-client');

console.log('Testing kubectl commands...\n');

// Connect to Angular SSR server
const socket = io('http://localhost:4000', {
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

let outputBuffer = '';

socket.on('connect', () => {
  console.log('✓ Connected to Angular SSR server');

  // Request connection to K3s
  const sessionId = 'kubectl-test-' + Date.now();
  console.log(`✓ Requesting K3s connection with sessionId: ${sessionId}`);
  socket.emit('connect-to-k3s', { sessionId });
});

socket.on('k3s-connected', (data) => {
  console.log('✓ K3s connected:', data);

  // Create terminal session
  console.log('✓ Creating terminal session...');
  socket.emit('create-terminal', {
    sessionId: data.sessionId,
    cols: 120,
    rows: 30
  });
});

socket.on('terminal-created', (data) => {
  console.log('✓ Terminal session created:', data);

  // Send kubectl get nodes command
  setTimeout(() => {
    console.log('\n✓ Testing: kubectl get nodes\n');
    socket.emit('terminal-input', 'kubectl get nodes\r');
  }, 1000);

  // Send kubectl get pods command
  setTimeout(() => {
    console.log('\n✓ Testing: kubectl get pods -A\n');
    socket.emit('terminal-input', 'kubectl get pods -A\r');
  }, 4000);

  // Disconnect after 8 seconds
  setTimeout(() => {
    console.log('\n✓ Test complete, disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 8000);
});

socket.on('terminal-output', (data) => {
  process.stdout.write(data);
});

socket.on('k3s-error', (data) => {
  console.error('✗ K3s error:', data);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('\n✓ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('✗ Connection error:', error.message);
  process.exit(1);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.error('\n✗ Test timeout - no response after 15 seconds');
  process.exit(1);
}, 15000);
