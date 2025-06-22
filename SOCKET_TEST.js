// Test Socket Connection
// Run this in browser console to test socket connection

const testSocket = () => {
  console.log('🧪 Testing socket connection...');
  
  // Test if we can reach the backend API
  fetch('http://localhost:5000/api/health')
    .then(response => response.json())
    .then(data => {
      console.log('✅ Backend API is reachable:', data);
      
      // Test socket connection
      const testSocket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        timeout: 5000
      });
      
      testSocket.on('connect', () => {
        console.log('✅ Socket connected successfully!');
        testSocket.disconnect();
      });
      
      testSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection failed:', error);
      });
      
    })
    .catch(error => {
      console.error('❌ Backend API unreachable:', error);
    });
};

// Run the test
testSocket();
