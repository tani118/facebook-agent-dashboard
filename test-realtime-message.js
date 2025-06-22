// Test script to simulate incoming Facebook message and verify real-time updates
const axios = require('axios');

async function testRealTimeMessage() {
    console.log('🧪 Testing Real-Time Message Flow...');
    
    // Simulate a Facebook webhook event for an incoming message
    const webhookPayload = {
        object: 'page',
        entry: [{
            id: 'test-page-123', // This should match a page ID in your database
            time: Date.now(),
            messaging: [{
                sender: { 
                    id: 'test-customer-456' // Customer sending message
                },
                recipient: { 
                    id: 'test-page-123' // Your page receiving the message
                },
                timestamp: Date.now(),
                message: {
                    mid: 'test-message-' + Date.now(),
                    text: 'Hello! This is a real-time test message from a customer.'
                }
            }]
        }]
    };

    try {
        console.log('📤 Sending webhook event to backend...');
        const response = await axios.post('http://localhost:5000/api/webhook', webhookPayload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Webhook response:', response.status, response.data);
        console.log('📡 If real-time is working, connected frontend clients should see the message immediately');
        
    } catch (error) {
        console.error('❌ Webhook test failed:', error.response?.status, error.response?.data || error.message);
    }
}

// Run the test
testRealTimeMessage();
