#!/usr/bin/env node

const { MongoClient } = require('mongodb');

async function fixDuplicateConversations() {
  try {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('facebook_dashboard');
    
    // Step 1: Find all duplicate conversations (same pageId + customerId)
    console.log('\n=== STEP 1: Finding duplicate conversations ===');
    
    const conversations = await db.collection('conversations').find({}).toArray();
    console.log(`Total conversations: ${conversations.length}`);
    
    // Group conversations by pageId + customerId
    const conversationGroups = {};
    conversations.forEach(conv => {
      const key = `${conv.pageId}_${conv.customerId}`;
      if (!conversationGroups[key]) {
        conversationGroups[key] = [];
      }
      conversationGroups[key].push(conv);
    });
    
    // Find groups with duplicates
    const duplicateGroups = Object.entries(conversationGroups).filter(([key, group]) => group.length > 1);
    console.log(`Found ${duplicateGroups.length} groups with duplicate conversations`);
    
    for (const [key, group] of duplicateGroups) {
      console.log(`\nGroup ${key}:`);
      group.forEach((conv, index) => {
        console.log(`  ${index + 1}. ID: ${conv.conversationId} (Created: ${conv.createdAt})`);
      });
    }
    
    // Step 2: For each duplicate group, consolidate into one conversation
    console.log('\n=== STEP 2: Consolidating duplicate conversations ===');
    
    for (const [key, group] of duplicateGroups) {
      console.log(`\nProcessing group ${key}...`);
      
      // Sort by creation date (keep the oldest one as primary)
      group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const primaryConversation = group[0];
      const duplicateConversations = group.slice(1);
      
      console.log(`Primary conversation: ${primaryConversation.conversationId}`);
      console.log(`Duplicate conversations to merge: ${duplicateConversations.map(c => c.conversationId).join(', ')}`);
      
      // Step 2a: Collect all messages from all conversations (both embedded and from messages collection)
      let allMessages = [];
      
      // Get messages from embedded messages in all conversations
      for (const conv of group) {
        if (conv.messages && conv.messages.length > 0) {
          console.log(`  Found ${conv.messages.length} embedded messages in ${conv.conversationId}`);
          allMessages.push(...conv.messages);
        }
      }
      
      // Get messages from messages collection for all conversation IDs
      for (const conv of group) {
        const externalMessages = await db.collection('messages').find({
          conversationId: conv.conversationId
        }).toArray();
        
        if (externalMessages.length > 0) {
          console.log(`  Found ${externalMessages.length} external messages for ${conv.conversationId}`);
          // Convert external messages to embedded format
          const convertedMessages = externalMessages.map(msg => ({
            messageId: msg._id.toString(),
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            message: msg.content || msg.message || msg.text || '',
            timestamp: msg.sentAt || msg.timestamp || msg.createdAt,
            type: msg.messageType || msg.type || 'text'
          }));
          allMessages.push(...convertedMessages);
        }
      }
      
      // Remove duplicates and sort messages by timestamp
      const uniqueMessages = [];
      const messageIds = new Set();
      
      allMessages.forEach(msg => {
        const msgKey = `${msg.senderId}_${msg.message}_${msg.timestamp}`;
        if (!messageIds.has(msgKey) && msg.message && msg.message !== 'undefined') {
          messageIds.add(msgKey);
          uniqueMessages.push(msg);
        }
      });
      
      // Sort messages by timestamp
      uniqueMessages.sort((a, b) => {
        const aTime = new Date(a.timestamp || a.created_time || 0);
        const bTime = new Date(b.timestamp || b.created_time || 0);
        return aTime - bTime;
      });
      
      console.log(`  Total unique messages to consolidate: ${uniqueMessages.length}`);
      
      // Step 2b: Update primary conversation with all messages
      const lastMessage = uniqueMessages[uniqueMessages.length - 1];
      const updateData = {
        messages: uniqueMessages,
        lastMessageTime: lastMessage ? new Date(lastMessage.timestamp) : undefined,
        lastMessageFromCustomer: lastMessage ? (lastMessage.senderId === primaryConversation.customerId) : undefined,
        updatedAt: new Date()
      };
      
      await db.collection('conversations').updateOne(
        { _id: primaryConversation._id },
        { $set: updateData }
      );
      
      console.log(`  Updated primary conversation ${primaryConversation.conversationId} with ${uniqueMessages.length} messages`);
      
      // Step 2c: Update all external messages to point to primary conversation
      for (const conv of duplicateConversations) {
        await db.collection('messages').updateMany(
          { conversationId: conv.conversationId },
          { $set: { conversationId: primaryConversation.conversationId } }
        );
        console.log(`  Updated external messages from ${conv.conversationId} to ${primaryConversation.conversationId}`);
      }
      
      // Step 2d: Delete duplicate conversations
      const duplicateIds = duplicateConversations.map(c => c._id);
      await db.collection('conversations').deleteMany({
        _id: { $in: duplicateIds }
      });
      
      console.log(`  Deleted ${duplicateIds.length} duplicate conversations`);
    }
    
    // Step 3: Verify the consolidation
    console.log('\n=== STEP 3: Verification ===');
    
    const finalConversations = await db.collection('conversations').find({}).toArray();
    console.log(`Final conversation count: ${finalConversations.length}`);
    
    // Check for any remaining duplicates
    const finalGroups = {};
    finalConversations.forEach(conv => {
      const key = `${conv.pageId}_${conv.customerId}`;
      if (!finalGroups[key]) {
        finalGroups[key] = [];
      }
      finalGroups[key].push(conv);
    });
    
    const remainingDuplicates = Object.entries(finalGroups).filter(([key, group]) => group.length > 1);
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ No duplicate conversations remaining');
    } else {
      console.log(`❌ Still have ${remainingDuplicates.length} duplicate groups`);
    }
    
    // Display final state
    finalConversations.forEach(conv => {
      console.log(`Conversation: ${conv.conversationId}`);
      console.log(`  Customer: ${conv.customerName} (${conv.customerId})`);
      console.log(`  Messages: ${conv.messages ? conv.messages.length : 0}`);
      console.log(`  Last Message: ${conv.lastMessageTime}`);
      console.log('---');
    });
    
    await client.close();
    console.log('\n✅ Duplicate conversation consolidation completed!');
    
  } catch (error) {
    console.error('❌ Error fixing duplicate conversations:', error);
  }
}

// Run the fix
fixDuplicateConversations();
