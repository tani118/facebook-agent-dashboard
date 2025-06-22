// Browser Console Test for Socket.IO
// Paste this into your browser console on http://localhost:5176

console.log('🧪 Testing Socket.IO from browser console...');

// Test 1: Check if Socket.IO client is available
if (typeof io !== 'undefined') {
  console.log('✅ Socket.IO client is available');
  
  // Test 2: Try to connect
  const testSocket = io('http://localhost:5000', {
    transports: ['polling', 'websocket'],
    timeout: 5000,
    autoConnect: true
  });
  
  testSocket.on('connect', () => {
    console.log('✅ Socket connected! ID:', testSocket.id);
    console.log('Transport used:', testSocket.io.engine.transport.name);
    testSocket.disconnect();
  });
  
  testSocket.on('connect_error', (error) => {
    console.error('❌ Socket connection failed:', error);
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
  });
  
} else {
  console.error('❌ Socket.IO client not available');
  console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('socket')));
}
