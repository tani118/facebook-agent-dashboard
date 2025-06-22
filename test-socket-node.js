#!/usr/bin/env node

const { io } = require('socket.io-client');

console.log('🧪 Testing Socket.IO connection from Node.js...');

const socket = io('http://localhost:5000', {
  autoConnect: true,
  timeout: 5000
});

socket.on('connect', () => {
  console.log('✅ Socket connected successfully!');
  console.log('Socket ID:', socket.id);
  
  // Test joining a room
  socket.emit('join-user-room', 'test-user');
  console.log('📡 Sent join-user-room event');
  
  setTimeout(() => {
    socket.disconnect();
    console.log('🔌 Test completed, disconnected');
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection failed:', error.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});

setTimeout(() => {
  console.log('⏰ Connection timeout');
  process.exit(1);
}, 10000);
