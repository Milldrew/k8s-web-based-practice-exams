const io = require('socket.io-client');

console.log('Testing terminal connection...\n');

// Connect to Angular SSR server
const socket = io('http://localhost:4000', {
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✓ Connected to Angular SSR server');

  // Request connection to K3s
  const sessionId = 'test-session-' + Date.now();
  console.log(`✓ Requesting K3s connection with sessionId: ${sessionId}`);
  socket.emit('connect-to-k3s', { sessionId });
});

socket.on('k3s-connected', (data) => {
  console.log('✓ K3s connected:', data);

  // Create terminal session
  console.log('✓ Creating terminal session...');
  socket.emit('create-terminal', {
    sessionId: data.sessionId,
    cols: 80,
    rows: 24
  });
});

socket.on('terminal-created', (data) => {
  console.log('✓ Terminal session created:', data);

  // Send a test command
  console.log('✓ Sending test command: ls -la\n');
  socket.emit('terminal-input', 'ls -la\r');

  // Wait a bit for output, then send another command
  setTimeout(() => {
    console.log('✓ Sending test command: pwd\n');
    socket.emit('terminal-input', 'pwd\r');
  }, 2000);

  // Disconnect after 5 seconds
  setTimeout(() => {
    console.log('\n✓ Test complete, disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 5000);
});

socket.on('terminal-output', (data) => {
  console.log('✓ Terminal output received:');
  console.log('---START OUTPUT---');
  process.stdout.write(data);
  console.log('\n---END OUTPUT---\n');
});

socket.on('k3s-error', (data) => {
  console.error('✗ K3s error:', data);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('✓ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('✗ Connection error:', error.message);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('\n✗ Test timeout - no response after 10 seconds');
  process.exit(1);
}, 10000);
