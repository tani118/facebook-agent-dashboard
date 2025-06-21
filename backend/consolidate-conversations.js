const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

async function consolidateConversations() {
  try {
    await mongoose.connect('mongodb://localhost:27017/facebook-helpdesk-dashboard');
    console.log('Connected to MongoDB');

    // Find ALL conversations first
    const allConversations = await Conversation.find({}).sort({ createdAt: 1 });
    console.log(`Total conversations found: ${allConversations.length}`);
    
    for (const conv of allConversations) {
      console.log(`- ID: ${conv.conversationId}, Customer: ${conv.customerName} (${conv.customerId}), Created: ${conv.createdAt}`);
    }

    // Find duplicate conversations for the same customer (same pageId, customerId, userId but different conversationId)
    const customerGroups = {};
    
    for (const conv of allConversations) {
      const key = `${conv.pageId}_${conv.customerId}_${conv.userId}`;
      if (!customerGroups[key]) {
        customerGroups[key] = [];
      }
      customerGroups[key].push(conv);
    }

    const duplicates = Object.values(customerGroups).filter(group => group.length > 1);

    console.log(`Found ${duplicates.length} sets of duplicate conversations`);

    for (const conversationGroup of duplicates) {
      console.log(`\nProcessing duplicates for customer ${conversationGroup[0].customerId}:`);
      
      // Sort conversations by creation date (keep the earliest one)
      const sortedConversations = conversationGroup.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      const primaryConversation = sortedConversations[0];
      const conversationsToMerge = sortedConversations.slice(1);
      
      console.log(`Primary conversation: ${primaryConversation.conversationId}`);
      console.log(`Conversations to merge: ${conversationsToMerge.map(c => c.conversationId).join(', ')}`);

      // Update the primary conversation with the latest data
      let latestMessageAt = new Date(primaryConversation.lastMessageAt);
      let combinedUnreadCount = primaryConversation.unreadCount || 0;
      let latestMessageContent = primaryConversation.lastMessageContent || '';

      // Find the latest message data from all conversations
      for (const conv of conversationsToMerge) {
        if (new Date(conv.lastMessageAt) > latestMessageAt) {
          latestMessageAt = new Date(conv.lastMessageAt);
          latestMessageContent = conv.lastMessageContent || latestMessageContent;
        }
        combinedUnreadCount += (conv.unreadCount || 0);
      }

      // Update primary conversation
      await Conversation.findByIdAndUpdate(primaryConversation._id, {
        lastMessageAt: latestMessageAt,
        lastMessageContent: latestMessageContent,
        unreadCount: combinedUnreadCount,
        status: 'active'
      });

      // Move all messages from duplicate conversations to primary conversation
      for (const conv of conversationsToMerge) {
        await Message.updateMany(
          { conversationId: conv.conversationId },
          { 
            conversationId: primaryConversation.conversationId,
            facebookConversationId: primaryConversation.conversationId
          }
        );
        
        console.log(`Moved messages from ${conv.conversationId} to ${primaryConversation.conversationId}`);
      }

      // Delete duplicate conversations
      const duplicateIds = conversationsToMerge.map(c => c._id);
      await Conversation.deleteMany({ _id: { $in: duplicateIds } });
      
      console.log(`Deleted ${duplicateIds.length} duplicate conversations`);
    }

    // Verify results
    const remainingConversations = await Conversation.find({});
    console.log(`\nConsolidation complete! Remaining conversations: ${remainingConversations.length}`);
    
    for (const conv of remainingConversations) {
      console.log(`- ${conv.customerName}: ${conv.conversationId} (${conv.unreadCount} unread)`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error during consolidation:', error);
  }
}

consolidateConversations();
