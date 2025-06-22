const { io } = require('socket.io-client');

console.log('🔧 Testing Socket.IO Real-time Connection...');

// Connect to the backend Socket.IO server
const socket = io('http://localhost:5000', {
  autoConnect: true,
  reconnection: true,
  transports: ['polling', 'websocket']
});

socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO server:', socket.id);
  
  // Join a test user room
  socket.emit('join-user-room', 'test-user-123');
  socket.emit('join-page-room', 'test-page-456');
  
  // Test emitting a message event after 2 seconds
  setTimeout(() => {
    console.log('📤 Emitting test message event...');
    socket.emit('test-new-message', {
      conversationId: 'test-conversation',
      message: {
        messageId: 'test-msg-' + Date.now(),
        senderId: 'test-sender',
        senderName: 'Test Customer',
        content: 'This is a test message from the Socket.IO test script',
        timestamp: new Date().toISOString(),
        type: 'incoming'
      }
    });
  }, 2000);
  
  // Test emitting a comment event after 4 seconds
  setTimeout(() => {
    console.log('📤 Emitting test comment event...');
    socket.emit('test-new-comment', {
      pageId: 'test-page-456',
      commentId: 'test-comment-' + Date.now(),
      postId: 'test-post',
      message: 'This is a test comment from the Socket.IO test script'
    });
  }, 4000);
  
  // Disconnect after 6 seconds
  setTimeout(() => {
    console.log('🔌 Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 6000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server');
});

// Listen for any events that might be emitted back
socket.onAny((eventName, ...args) => {
  console.log('📥 Received event:', eventName, args);
});
