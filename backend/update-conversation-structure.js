#!/usr/bin/env node

const { MongoClient } = require('mongodb');

async function updateConversationStructure() {
  try {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('facebook_dashboard');
    
    console.log('\n=== STEP 1: Update existing conversation structure ===');
    
    // Get the current conversation
    const conversations = await db.collection('conversations').find({}).toArray();
    console.log(`Found ${conversations.length} conversations`);
    
    for (const conv of conversations) {
      console.log(`\nUpdating conversation: ${conv.conversationId}`);
      
      // If the conversation ID looks like a Facebook API ID (starts with 't_'), set it as facebookConversationId
      if (conv.conversationId.startsWith('t_')) {
        const updateResult = await db.collection('conversations').updateOne(
          { _id: conv._id },
          {
            $set: {
              facebookConversationId: conv.conversationId,
              conversationId: `${conv.pageId}_${conv.customerId}_unified`,
              updatedAt: new Date()
            }
          }
        );
        console.log(`  Set facebookConversationId to: ${conv.conversationId}`);
        console.log(`  Changed conversationId to: ${conv.pageId}_${conv.customerId}_unified`);
      } else {
        // For webhook format IDs, just add the field if it doesn't exist
        if (!conv.facebookConversationId) {
          await db.collection('conversations').updateOne(
            { _id: conv._id },
            {
              $set: {
                facebookConversationId: null,
                updatedAt: new Date()
              }
            }
          );
          console.log(`  Added facebookConversationId field (null) for webhook conversation`);
        }
      }
    }
    
    console.log('\n=== STEP 2: Verify conversation structure ===');
    
    const updatedConversations = await db.collection('conversations').find({}).toArray();
    updatedConversations.forEach(conv => {
      console.log(`Conversation ID: ${conv.conversationId}`);
      console.log(`  Facebook ID: ${conv.facebookConversationId || 'null'}`);
      console.log(`  Page: ${conv.pageId}`);
      console.log(`  Customer: ${conv.customerName} (${conv.customerId})`);
      console.log(`  Messages: ${conv.messages ? conv.messages.length : 0}`);
      console.log('---');
    });
    
    console.log('\n=== STEP 3: Test unified conversation lookup ===');
    
    // Test finding conversation by pageId + customerId
    const testPageId = '666760583189727';
    const testCustomerId = '9816423021801337';
    
    const foundConversation = await db.collection('conversations').findOne({
      pageId: testPageId,
      customerId: testCustomerId
    });
    
    if (foundConversation) {
      console.log(`✅ Successfully found conversation by pageId + customerId:`);
      console.log(`   Conversation ID: ${foundConversation.conversationId}`);
      console.log(`   Facebook ID: ${foundConversation.facebookConversationId || 'null'}`);
      console.log(`   Customer: ${foundConversation.customerName}`);
    } else {
      console.log(`❌ Could not find conversation by pageId + customerId`);
    }
    
    await client.close();
    console.log('\n✅ Conversation structure update completed!');
    
  } catch (error) {
    console.error('❌ Error updating conversation structure:', error);
  }
}

// Run the update
updateConversationStructure();
