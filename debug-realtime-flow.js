#!/usr/bin/env node

/**
 * Debug Real-time Message Flow
 * This script tests the complete flow from webhook reception to frontend display
 */

const axios = require('axios');
const { io } = require('socket.io-client');

// Configuration
const BACKEND_URL = 'http://localhost:5000';
const WEBHOOK_URL = `${BACKEND_URL}/api/webhook`;

// Test data - adjust these based on your actual setup
const TEST_CONFIG = {
  pageId: '17841401779050828',
  customerId: '7329359483850458',
  userId: '676799dee17866fbeb6b5c59', // Replace with actual user ID
  pageAccessToken: 'your_page_access_token', // Replace with actual token
  webhookVerifyToken: process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'your_webhook_verify_token'
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
    socketClient = io(BACKEND_URL, {
      autoConnect: true,
      reconnection: false,
      transports: ['polling', 'websocket']
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
      log('SOCKET_RECEIVED', '📩 Received new-message event', data);
    });

    socketClient.on('conversation-updated', (data) => {
      log('SOCKET_RECEIVED', '💬 Received conversation-updated event', data);
    });
  });
}

// Generate test webhook payload
function generateWebhookPayload() {
  const timestamp = Date.now();
  const messageId = `mid_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
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
          text: `Test message from debug script at ${new Date().toLocaleTimeString()}`
        }
      }]
    }]
  };
}

// Test webhook endpoint
async function testWebhookEndpoint() {
  try {
    log('WEBHOOK', 'Testing webhook endpoint...');
    
    const payload = generateWebhookPayload();
    log('WEBHOOK_PAYLOAD', 'Sending payload', payload);
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    log('WEBHOOK_RESPONSE', 'Webhook response', {
      status: response.status,
      data: response.data
    });
    
    return { success: true, payload };
  } catch (error) {
    log('WEBHOOK_ERROR', 'Webhook request failed', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return { success: false, error };
  }
}

// Check if conversation exists
async function checkConversation() {
  try {
    log('DATABASE', 'Checking conversations in database...');
    
    const response = await axios.get(`${BACKEND_URL}/api/conversations`, {
      timeout: 5000
    });
    
    const conversations = response.data.conversations || [];
    const targetConversation = conversations.find(conv => 
      conv.pageId === TEST_CONFIG.pageId && 
      conv.customerId === TEST_CONFIG.customerId
    );
    
    log('DATABASE_CONVERSATIONS', 'Found conversations', {
      total: conversations.length,
      targetFound: !!targetConversation,
      target: targetConversation || 'Not found'
    });
    
    return targetConversation;
  } catch (error) {
    log('DATABASE_ERROR', 'Failed to fetch conversations', {
      message: error.message,
      status: error.response?.status
    });
    return null;
  }
}

// Check messages for conversation
async function checkMessages(conversationId) {
  try {
    log('DATABASE', 'Checking messages for conversation...', { conversationId });
    
    const response = await axios.get(`${BACKEND_URL}/api/conversations/${conversationId}/messages`, {
      timeout: 5000
    });
    
    const messages = response.data.messages || [];
    log('DATABASE_MESSAGES', 'Found messages', {
      count: messages.length,
      latest: messages[messages.length - 1] || 'No messages'
    });
    
    return messages;
  } catch (error) {
    log('DATABASE_ERROR', 'Failed to fetch messages', {
      message: error.message,
      status: error.response?.status
    });
    return [];
  }
}

// Main test sequence
async function runDebugSequence() {
  try {
    log('TEST_START', 'Starting real-time message flow debug test');
    
    // Step 1: Setup socket connection
    log('STEP_1', 'Setting up Socket.IO client connection...');
    await setupSocketClient();
    
    // Step 2: Check initial state
    log('STEP_2', 'Checking initial conversation state...');
    const initialConversation = await checkConversation();
    
    // Step 3: Send webhook request
    log('STEP_3', 'Sending test webhook request...');
    const webhookResult = await testWebhookEndpoint();
    
    if (!webhookResult.success) {
      log('TEST_FAILED', 'Webhook request failed, stopping test');
      return;
    }
    
    // Step 4: Wait for processing
    log('STEP_4', 'Waiting 2 seconds for webhook processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 5: Check final state
    log('STEP_5', 'Checking final conversation state...');
    const finalConversation = await checkConversation();
    
    if (finalConversation) {
      const messages = await checkMessages(finalConversation.conversationId);
      
      // Check if our test message is in the database
      const testMessage = messages.find(msg => 
        msg.content && msg.content.includes('Test message from debug script')
      );
      
      log('TEST_RESULT', 'Database update status', {
        conversationExists: !!finalConversation,
        messageInDatabase: !!testMessage,
        totalMessages: messages.length
      });
    }
    
    // Step 6: Summary
    log('TEST_SUMMARY', 'Debug test completed', {
      webhookSuccessful: webhookResult.success,
      socketConnected: socketClient?.connected,
      conversationFound: !!finalConversation
    });
    
  } catch (error) {
    log('TEST_ERROR', 'Debug test failed', error);
  } finally {
    if (socketClient) {
      socketClient.disconnect();
      log('CLEANUP', 'Disconnected Socket.IO client');
    }
  }
}

// Run the test
if (require.main === module) {
  runDebugSequence().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { runDebugSequence, TEST_CONFIG };
