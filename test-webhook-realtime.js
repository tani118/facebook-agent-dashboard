const axios = require('axios');

// Test webhook endpoint with a simulated Facebook message webhook
const testWebhook = async () => {
  console.log('🧪 Testing Facebook Webhook Real-time Flow...');
  
  try {
    // Simulate a Facebook webhook for new message
    const messageWebhookPayload = {
      object: 'page',
      entry: [{
        id: 'test-page-id',
        time: Date.now(),
        messaging: [{
          sender: { id: 'test-customer-id' },
          recipient: { id: 'test-page-id' },
          timestamp: Date.now(),
          message: {
            mid: 'test-message-' + Date.now(),
            text: 'Hello! This is a test message from webhook simulation.'
          }
        }]
      }]
    };

    console.log('📤 Sending simulated message webhook...');
    const messageResponse = await axios.post('http://localhost:5000/api/webhook/facebook', messageWebhookPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Message webhook response:', messageResponse.status);
    
    // Wait a bit then simulate a comment webhook
    setTimeout(async () => {
      const commentWebhookPayload = {
        object: 'page',
        entry: [{
          id: 'test-page-id',
          time: Date.now(),
          changes: [{
            field: 'feed',
            value: {
              item: 'comment',
              comment_id: 'test-comment-' + Date.now(),
              post_id: 'test-post-id',
              verb: 'add',
              message: 'This is a test comment from webhook simulation.'
            }
          }]
        }]
      };

      console.log('📤 Sending simulated comment webhook...');
      try {
        const commentResponse = await axios.post('http://localhost:5000/api/webhook/facebook', commentWebhookPayload, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Comment webhook response:', commentResponse.status);
      } catch (error) {
        console.error('❌ Comment webhook error:', error.response?.status, error.response?.data);
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Message webhook error:', error.response?.status, error.response?.data);
  }
};

testWebhook();
