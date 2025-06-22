#!/usr/bin/env node

/**
 * Test Real-time Message Flow with Ngrok
 */

const axios = require('axios');
const { io } = require('socket.io-client');

// Configuration with your ngrok URL
const NGROK_URL = 'https://6de4-103-108-5-157.ngrok-free.app';
const WEBHOOK_URL = `${NGROK_URL}/api/webhook`;

// Test data
const TEST_CONFIG = {
  pageId: '17841401779050828',
  customerId: '7329359483850458',
  userId: '676799dee17866fbeb6b5c59',
  ngrokUrl: NGROK_URL
};

// Enhanced logging
const log = (stage, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${stage}: ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// Socket client for testing real-time reception
let socketClient = null;

function setupSocketClient() {
  return new Promise((resolve, reject) => {
    log('SOCKET', `Connecting to Socket.IO server at ${NGROK_URL}`);
    
    socketClient = io(NGROK_URL, {
      autoConnect: true,
      reconnection: false,
      transports: ['polling', 'websocket'],
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true'
      }
    });

    socketClient.on('connect', () => {
      log('SOCKET', 'Connected to Socket.IO server', { socketId: socketClient.id });
      
      // Join user room
      socketClient.emit('join-user-room', TEST_CONFIG.userId);
      log('SOCKET', 'Joined user room', { userId: TEST_CONFIG.userId });
      
      // Join page room
      socketClient.emit('join-page-room', TEST_CONFIG.pageId);
      log('SOCKET', 'Joined page room', { pageId: TEST_CONFIG.pageId });
      
      resolve();
    });

    socketClient.on('connect_error', (error) => {
      log('SOCKET_ERROR', 'Connection failed', error);
      reject(error);
    });

    socketClient.on('new-message', (data) => {
      log('SOCKET_RECEIVED', '📩 SUCCESS! Received new-message event', data);
    });

    socketClient.on('conversation-updated', (data) => {
      log('SOCKET_RECEIVED', '💬 SUCCESS! Received conversation-updated event', data);
    });
  });
}

// Test webhook endpoint with ngrok
async function testWebhookWithNgrok() {
  try {
    log('WEBHOOK', 'Testing webhook endpoint via ngrok...');
    
    const timestamp = Date.now();
    const messageId = `ngrok_test_${timestamp}`;
    
    const payload = {
      object: 'page',
      entry: [{
        id: TEST_CONFIG.pageId,
        time: timestamp,
        messaging: [{
          sender: {
            id: TEST_CONFIG.customerId
          },
          recipient: {
            id: TEST_CONFIG.pageId
          },
          timestamp: timestamp,
          message: {
            mid: messageId,
            text: `Ngrok test message at ${new Date().toLocaleTimeString()}`
          }
        }]
      }]
    };
    
    log('WEBHOOK_PAYLOAD', 'Sending payload via ngrok', payload);
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 10000
    });
    
    log('WEBHOOK_RESPONSE', 'Webhook response via ngrok', {
      status: response.status,
      data: response.data
    });
    
    return { success: true, payload, messageId };
  } catch (error) {
    log('WEBHOOK_ERROR', 'Webhook request failed via ngrok', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return { success: false, error };
  }
}

// Check backend connectivity
async function checkBackendConnectivity() {
  try {
    log('CONNECTIVITY', 'Testing backend connectivity via ngrok...');
    
    const response = await axios.get(`${NGROK_URL}/api/health`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 5000
    });
    
    log('CONNECTIVITY', 'Backend is reachable via ngrok', {
      status: response.status,
      data: response.data
    });
    
    return true;
  } catch (error) {
    log('CONNECTIVITY_ERROR', 'Backend not reachable via ngrok', {
      message: error.message,
      status: error.response?.status
    });
    return false;
  }
}

// Main test sequence
async function runNgrokRealTimeTest() {
  try {
    log('TEST_START', 'Starting ngrok real-time message flow test');
    
    // Step 1: Test backend connectivity
    log('STEP_1', 'Testing backend connectivity via ngrok...');
    const backendReachable = await checkBackendConnectivity();
    
    if (!backendReachable) {
      log('TEST_FAILED', 'Backend not reachable via ngrok, stopping test');
      return;
    }
    
    // Step 2: Setup socket connection via ngrok
    log('STEP_2', 'Setting up Socket.IO client connection via ngrok...');
    await setupSocketClient();
    
    // Step 3: Send webhook request via ngrok
    log('STEP_3', 'Sending test webhook request via ngrok...');
    const webhookResult = await testWebhookWithNgrok();
    
    if (!webhookResult.success) {
      log('TEST_FAILED', 'Webhook request failed via ngrok, stopping test');
      return;
    }
    
    // Step 4: Wait for real-time events
    log('STEP_4', 'Waiting 5 seconds for real-time events...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 5: Summary
    log('TEST_SUMMARY', 'Ngrok real-time test completed', {
      backendReachable,
      webhookSuccessful: webhookResult.success,
      socketConnected: socketClient?.connected,
      ngrokUrl: NGROK_URL
    });
    
    log('NEXT_STEPS', 'If you didn\'t see "SUCCESS!" messages above, the issue is likely:');
    console.log('1. Socket connection not working through ngrok');
    console.log('2. Backend not emitting events properly');
    console.log('3. Frontend not receiving/handling events correctly');
    console.log('4. User/Page data not matching in database');
    
  } catch (error) {
    log('TEST_ERROR', 'Ngrok real-time test failed', error);
  } finally {
    if (socketClient) {
      socketClient.disconnect();
      log('CLEANUP', 'Disconnected Socket.IO client');
    }
  }
}

// Run the test
if (require.main === module) {
  runNgrokRealTimeTest().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { runNgrokRealTimeTest, TEST_CONFIG };
