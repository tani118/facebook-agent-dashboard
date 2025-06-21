const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const FacebookConversationService = require('../services/FacebookConversationService');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Webhook verification endpoint
router.get('/webhook', (req, res) => {
  // Parse the query params
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Check if a token and mode is in the query string of the request
  if (mode && token) {
    // Check the mode and token sent is correct
    if (mode === 'subscribe' && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
      // Respond with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      // Respond with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Webhook event handler
router.post('/webhook', (req, res) => {
  const body = req.body;

  // Check if this is an event from a page subscription
  if (body.object === 'page') {
    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach(async (entry) => {
      try {
        // Get the webhook event
        const webhookEvent = entry.messaging ? entry.messaging[0] : entry.changes ? entry.changes[0] : null;
        
        if (!webhookEvent) {
          console.log('No webhook event found');
          return;
        }

        // Handle different types of events
        if (entry.messaging) {
          // Messaging events (messages, postbacks, etc.)
          await handleMessagingEvent(entry);
        } else if (entry.changes) {
          // Page changes (comments, posts, etc.)
          await handlePageChanges(entry);
        }
      } catch (error) {
        console.error('Error processing webhook entry:', error);
      }
    });

    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');
  } else {
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

  console.log('Received message:', {
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

    if (users.length === 0) {
      console.log('No users found for page:', pageId);
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
    }
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}

// Find or create conversation based on 24-hour rule
async function findOrCreateConversation(pageId, customerId, userId, pageAccessToken) {
  try {
    // Find existing conversation
    let conversation = await Conversation.findOne({
      pageId: pageId,
      customerId: customerId,
      userId: userId
    }).sort({ lastMessageAt: -1 });

    // Check if we need to create a new conversation (24-hour rule)
    const shouldCreateNew = !conversation || 
      Conversation.shouldCreateNewConversation(conversation.lastMessageAt);

    if (shouldCreateNew) {
      // Get customer profile
      const service = new FacebookConversationService(pageAccessToken, userId, pageId);
      const profileResult = await service.fetcher.fetchUserProfile(customerId);
      
      const customerProfile = profileResult.success ? profileResult.data : {};
      
      // Create new conversation
      conversation = new Conversation({
        conversationId: `${pageId}_${customerId}_${Date.now()}`, // Generate unique ID
        pageId: pageId,
        userId: userId,
        customerId: customerId,
        customerName: customerProfile.name || customerProfile.first_name || 'Unknown',
        customerProfilePic: customerProfile.profile_pic || '',
        lastMessageAt: new Date(),
        status: 'active'
      });

      await conversation.save();
      console.log('Created new conversation:', conversation.conversationId);
    } else {
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
    verb: changeValue.verb // 'add', 'edit', 'remove'
  });

  // You can implement comment handling here
  // This could create conversations for comment management
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
