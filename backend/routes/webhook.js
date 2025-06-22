const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const FacebookConversationService = require('../services/FacebookConversationService');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Webhook verification endpoint
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

router.post('/', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(async (entry, index) => {
      console.log('Entry:', {
        messagingCount: entry.messaging ? entry.messaging.length : 0,
        changesCount: entry.changes ? entry.changes.length : 0
      });
      
      try {
        // Get the webhook event
        const webhookEvent = entry.messaging ? entry.messaging[0] : entry.changes ? entry.changes[0] : null;
        
        if (!webhookEvent) {
          console.log('❌ WEBHOOK: No webhook event found in entry');
          return;
        }

        // Handle different types of events
        if (entry.messaging) {
          console.log('📨 WEBHOOK: Processing messaging events...');
          // Messaging events (messages, postbacks, etc.)
          await handleMessagingEvent(entry);
        } else if (entry.changes) {
          console.log('📄 WEBHOOK: Processing page changes...');
          // Page changes (comments, posts, etc.)
          await handlePageChanges(entry);
        }
      } catch (error) {
        console.error('❌ WEBHOOK: Error processing webhook entry:', error);
      }
    });

    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');
  } else {
    console.log('❌ WEBHOOK: Invalid object type:', body.object);
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Handle messaging events (messages, postbacks, etc.)
async function handleMessagingEvent(entry) {
  const pageId = entry.id;
  const messagingEvents = entry.messaging;

  for (const messagingEvent of messagingEvents) {
    const senderId = messagingEvent.sender.id;
    const recipientId = messagingEvent.recipient.id;

    // Skip if the sender is the page itself (outgoing messages)
    if (senderId === pageId) {
      continue;
    }

    try {
      if (messagingEvent.message) {
        await handleIncomingMessage(messagingEvent, pageId);
      } else if (messagingEvent.postback) {
        await handlePostback(messagingEvent, pageId);
      } else if (messagingEvent.delivery) {
        await handleDeliveryConfirmation(messagingEvent, pageId);
      } else if (messagingEvent.read) {
        await handleMessageRead(messagingEvent, pageId);
      }
    } catch (error) {
      console.error('Error handling messaging event:', error);
    }
  }
}

// Handle incoming messages
async function handleIncomingMessage(messagingEvent, pageId) {
  const message = messagingEvent.message;
  const senderId = messagingEvent.sender.id;
  const timestamp = messagingEvent.timestamp;

  console.log('🔔 WEBHOOK: Received message:', {
    pageId,
    senderId,
    messageId: message.mid,
    text: message.text,
    timestamp
  });

  try {
    // Find users who have this page connected
    const users = await User.find({
      'facebookPages.pageId': pageId
    });

    console.log(`🔍 WEBHOOK: Found ${users.length} users for page ${pageId}`);

    if (users.length === 0) {
      console.log('❌ WEBHOOK: No users found for page:', pageId);
      return;
    }

    // Process message for each user (in case multiple users manage the same page)
    for (const user of users) {
      const pageData = user.facebookPages.find(page => page.pageId === pageId);
      if (!pageData || !pageData.pageAccessToken) {
        continue;
      }

      // Find or create conversation
      const conversation = await findOrCreateConversation(
        pageId,
        senderId,
        user._id,
        pageData.pageAccessToken
      );

      if (!conversation) {
        console.log('Failed to create/find conversation');
        continue;
      }

      // Save the message
      await saveIncomingMessage(
        message,
        senderId,
        conversation,
        pageId,
        user._id,
        timestamp
      );

      // Update conversation last message
      await updateConversationLastMessage(conversation, message.text || '[Attachment]', new Date(timestamp));

      // Emit real-time update to connected clients
      if (global.io) {
        const socketPayload = {
          conversationId: conversation.conversationId,
          message: {
            messageId: message.mid,
            senderId: senderId,
            senderName: conversation.customerName,
            content: message.text || '[Attachment]',
            timestamp: timestamp,
            type: 'incoming',
            profilePic: conversation.customerProfilePic
          },
          conversation: {
            conversationId: conversation.conversationId,
            customerName: conversation.customerName,
            customerProfilePic: conversation.customerProfilePic,
            lastMessageContent: message.text || '[Attachment]',
            lastMessageAt: new Date(timestamp),
            unreadCount: conversation.unreadCount || 0
          }
        };

        console.log(`📡 WEBHOOK: About to emit socket events for user ${user._id}:`);
        console.log(`📡 WEBHOOK: Socket payload:`, JSON.stringify(socketPayload, null, 2));
        console.log(`📡 WEBHOOK: Connected clients: ${global.io.engine.clientsCount}`);
        console.log(`📡 WEBHOOK: User room: user-${user._id}`);
        console.log(`📡 WEBHOOK: Page room: page-${pageId}`);

        // Emit to user-specific room
        global.io.to(`user-${user._id}`).emit('new-message', socketPayload);

        // Also emit to page-specific room
        global.io.to(`page-${pageId}`).emit('conversation-updated', {
          conversationId: conversation.conversationId,
          customerName: conversation.customerName,
          lastMessageContent: message.text || '[Attachment]',
          lastMessageAt: new Date(timestamp),
          unreadCount: conversation.unreadCount || 0
        });

        console.log(`📡 WEBHOOK: Successfully emitted real-time update for conversation ${conversation.conversationId}`);
      }
    }
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}

// Find or create conversation based on unified pageId + customerId matching
async function findOrCreateConversation(pageId, customerId, userId, pageAccessToken) {
  try {
    // Find existing conversation by pageId + customerId (unified approach)
    let conversation = await Conversation.findOne({
      pageId: pageId,
      customerId: customerId,
      userId: userId
    }).sort({ lastMessageAt: -1 });

    if (!conversation) {
      // Get customer profile
      const service = new FacebookConversationService(pageAccessToken, userId, pageId);
      const profileResult = await service.fetcher.fetchUserProfile(customerId);
      
      const customerProfile = profileResult.success ? profileResult.data : {};
      
      // Create new conversation with webhook format ID
      conversation = new Conversation({
        conversationId: `${pageId}_${customerId}_${Date.now()}`, // Generate unique ID
        pageId: pageId,
        userId: userId,
        customerId: customerId,
        customerName: customerProfile.name || customerProfile.first_name || 'Unknown',
        customerProfilePic: customerProfile.profile_pic || customerProfile.picture?.data?.url || '',
        lastMessageAt: new Date(),
        status: 'active'
      });

      await conversation.save();
      console.log('Created new conversation:', conversation.conversationId);
    } else {
      // Update existing conversation's last message time
      conversation.lastMessageAt = new Date();
      await conversation.save();
      console.log('Using existing conversation:', conversation.conversationId);
    }

    return conversation;
  } catch (error) {
    console.error('Error finding/creating conversation:', error);
    return null;
  }
}

// Save incoming message to database
async function saveIncomingMessage(fbMessage, senderId, conversation, pageId, userId, timestamp) {
  try {
    // Check if message already exists
    const existingMessage = await Message.findOne({
      messageId: fbMessage.mid
    });

    if (existingMessage) {
      console.log('Message already exists:', fbMessage.mid);
      return existingMessage;
    }

    // Process attachments
    const attachments = [];
    if (fbMessage.attachments) {
      fbMessage.attachments.forEach(attachment => {
        attachments.push({
          type: attachment.type || 'file',
          url: attachment.payload?.url || '',
          name: attachment.title || 'attachment'
        });
      });
    }

    // Determine message type
    let messageType = 'text';
    if (fbMessage.attachments && fbMessage.attachments.length > 0) {
      const firstAttachment = fbMessage.attachments[0];
      messageType = firstAttachment.type || 'file';
    } else if (fbMessage.sticker_id) {
      messageType = 'sticker';
    }

    // Create message
    const message = new Message({
      messageId: fbMessage.mid,
      conversationId: conversation.conversationId,
      facebookConversationId: conversation.conversationId,
      pageId: pageId,
      userId: userId,
      senderId: senderId,
      senderName: conversation.customerName,
      senderType: 'customer',
      content: fbMessage.text || '[Attachment]',
      messageType: messageType,
      attachments: attachments,
      sentAt: new Date(timestamp),
      isRead: false,
      deliveryStatus: 'delivered'
    });

    await message.save();
    console.log('Saved incoming message:', message.messageId);

    // Increment unread count
    conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    await conversation.save();

    return message;
  } catch (error) {
    console.error('Error saving incoming message:', error);
    return null;
  }
}

// Update conversation with last message info
async function updateConversationLastMessage(conversation, messageContent, timestamp) {
  try {
    conversation.lastMessageContent = messageContent;
    conversation.lastMessageAt = timestamp;
    await conversation.save();
  } catch (error) {
    console.error('Error updating conversation last message:', error);
  }
}

// Handle postback events (button clicks, quick replies)
async function handlePostback(messagingEvent, pageId) {
  const postback = messagingEvent.postback;
  const senderId = messagingEvent.sender.id;
  
  console.log('Received postback:', {
    pageId,
    senderId,
    payload: postback.payload,
    title: postback.title
  });

  // You can implement postback handling here
  // For example, treating postbacks as special messages
}

// Handle delivery confirmations
async function handleDeliveryConfirmation(messagingEvent, pageId) {
  const delivery = messagingEvent.delivery;
  const senderId = messagingEvent.sender.id;

  console.log('Message delivered:', {
    pageId,
    senderId,
    messageIds: delivery.mids,
    watermark: delivery.watermark
  });

  // Update message delivery status
  try {
    if (delivery.mids) {
      await Message.updateMany(
        { messageId: { $in: delivery.mids } },
        { deliveryStatus: 'delivered' }
      );
    }
  } catch (error) {
    console.error('Error updating delivery status:', error);
  }
}

// Handle message read confirmations
async function handleMessageRead(messagingEvent, pageId) {
  const read = messagingEvent.read;
  const senderId = messagingEvent.sender.id;

  console.log('Messages read:', {
    pageId,
    senderId,
    watermark: read.watermark
  });

  // You can implement read receipt handling here
}

// Handle page changes (comments, posts, etc.)
async function handlePageChanges(entry) {
  const pageId = entry.id;
  const changes = entry.changes;

  for (const change of changes) {
    try {
      if (change.field === 'feed' && change.value.item === 'comment') {
        await handleCommentEvent(change.value, pageId);
      } else if (change.field === 'feed' && change.value.item === 'post') {
        await handlePostEvent(change.value, pageId);
      }
    } catch (error) {
      console.error('Error handling page change:', error);
    }
  }
}

// Handle comment events
async function handleCommentEvent(changeValue, pageId) {
  console.log('Comment event:', {
    pageId,
    commentId: changeValue.comment_id,
    postId: changeValue.post_id,
    verb: changeValue.verb, // 'add', 'edit', 'remove'
    parentId: changeValue.parent_id // This indicates if it's a reply
  });

  // Handle new comments/replies
  if (changeValue.verb === 'add') {
    try {
      // Find users who have this page connected
      const users = await User.find({ 'facebookPages.pageId': pageId });
      
      if (users.length > 0) {
        // Emit real-time update to all connected users for this page
        if (global.io) {
          const eventData = {
            pageId: pageId,
            commentId: changeValue.comment_id,
            postId: changeValue.post_id,
            parentId: changeValue.parent_id,
            isReply: !!changeValue.parent_id,
            verb: changeValue.verb,
            message: 'New comment/reply received',
            timestamp: new Date().toISOString()
          };

          users.forEach(user => {
            // Emit to user-specific room
            global.io.to(`user-${user._id}`).emit('new-comment', eventData);
            
            // Also emit to page-specific room for immediate updates
            global.io.to(`page-${pageId}`).emit('new-comment', eventData);
          });
        }
        
        console.log(`📡 Notified ${users.length} users about new comment/reply`);
      }
    } catch (error) {
      console.error('Error handling comment event:', error);
    }
  }
}

// Handle post events
async function handlePostEvent(changeValue, pageId) {
  console.log('Post event:', {
    pageId,
    postId: changeValue.post_id,
    verb: changeValue.verb // 'add', 'edit', 'remove'
  });

  // You can implement post handling here
}

// Verify webhook signature (for security)
function verifySignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  
  if (!signature) {
    console.log('No signature found');
    return res.sendStatus(403);
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.log('Invalid signature');
    return res.sendStatus(403);
  }

  next();
}

// Apply signature verification to POST webhook (uncomment when you have app secret)
// router.post('/webhook', verifySignature, (req, res) => { ... });

module.exports = router;
