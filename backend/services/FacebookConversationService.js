const FacebookMessageFetcher = require('../api/fetch-messages');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

class FacebookConversationService {
  constructor(pageAccessToken, userId, pageId) {
    this.fetcher = new FacebookMessageFetcher(pageAccessToken);
    this.userId = userId;
    this.pageId = pageId;
  }

  /**
   * Sync conversations from Facebook to local database
   * @param {number} limit - Number of conversations to sync
   * @returns {Object} Sync result
   */
  async syncConversations(limit = 25) {
    try {
      const result = await this.fetcher.fetchConversations(this.pageId, limit);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      const syncedConversations = [];
      
      for (const fbConversation of result.data.data) {
        try {
          // Get customer info from participants
          let customerId = null;
          let customerName = 'Unknown';
          
          if (fbConversation.participants && fbConversation.participants.data) {
            const customer = fbConversation.participants.data.find(p => p.id !== this.pageId);
            if (customer) {
              customerId = customer.id;
              customerName = customer.name || 'Unknown';
            }
          }

          if (!customerId) continue;

          // Check if conversation exists
          let conversation = await Conversation.findOne({
            conversationId: fbConversation.id,
            userId: this.userId
          });

          if (!conversation) {
            // Get customer profile for more details
            const profileResult = await this.fetcher.fetchUserProfile(customerId);
            const customerProfile = profileResult.success ? profileResult.data : {};

            conversation = new Conversation({
              conversationId: fbConversation.id,
              pageId: this.pageId,
              userId: this.userId,
              customerId: customerId,
              customerName: customerProfile.name || customerName,
              customerProfilePic: customerProfile.profile_pic || '',
              lastMessageAt: new Date(fbConversation.updated_time),
              unreadCount: fbConversation.unread_count || 0
            });
          } else {
            // Update existing conversation
            conversation.lastMessageAt = new Date(fbConversation.updated_time);
            conversation.unreadCount = fbConversation.unread_count || 0;
            if (customerName !== 'Unknown') {
              conversation.customerName = customerName;
            }
          }

          await conversation.save();
          syncedConversations.push(conversation);

        } catch (convError) {
          console.error('Error syncing conversation:', fbConversation.id, convError);
          continue;
        }
      }

      return {
        success: true,
        data: {
          syncedCount: syncedConversations.length,
          conversations: syncedConversations
        }
      };

    } catch (error) {
      console.error('Sync conversations error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync messages for a specific conversation
   * @param {string} conversationId - Local conversation ID
   * @param {number} limit - Number of messages to sync
   * @returns {Object} Sync result
   */
  async syncMessages(conversationId, limit = 25) {
    try {
      // Find local conversation
      const conversation = await Conversation.findOne({
        conversationId: conversationId,
        userId: this.userId
      });

      if (!conversation) {
        return {
          success: false,
          error: 'Conversation not found'
        };
      }

      const result = await this.fetcher.fetchMessages(conversationId, limit);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      const syncedMessages = [];
      
      for (const fbMessage of result.data.data) {
        try {
          // Check if message already exists
          const existingMessage = await Message.findOne({
            messageId: fbMessage.id
          });

          if (existingMessage) continue;

          // Determine sender type
          let senderType = 'customer';
          if (fbMessage.from && fbMessage.from.id === this.pageId) {
            senderType = 'page';
          }

          const message = new Message({
            messageId: fbMessage.id,
            conversationId: conversation.conversationId,
            facebookConversationId: conversationId,
            pageId: this.pageId,
            userId: this.userId,
            senderId: fbMessage.from ? fbMessage.from.id : 'unknown',
            senderName: fbMessage.from ? fbMessage.from.name : 'Unknown',
            senderType: senderType,
            content: fbMessage.message || '',
            sentAt: new Date(fbMessage.created_time),
            attachments: this.processAttachments(fbMessage.attachments),
            messageType: this.determineMessageType(fbMessage)
          });

          await message.save();
          syncedMessages.push(message);

          // Update conversation last message
          if (syncedMessages.length === 1) { // First message (most recent)
            conversation.lastMessageContent = message.content;
            conversation.lastMessageAt = message.sentAt;
          }

        } catch (msgError) {
          console.error('Error syncing message:', fbMessage.id, msgError);
          continue;
        }
      }

      await conversation.save();

      return {
        success: true,
        data: {
          syncedCount: syncedMessages.length,
          messages: syncedMessages
        }
      };

    } catch (error) {
      console.error('Sync messages error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send a message and save to local database
   * @param {string} conversationId - Facebook conversation ID
   * @param {string} messageContent - Message content
   * @returns {Object} Send result
   */
  async sendMessage(conversationId, messageContent) {
    try {
      // Send message via Facebook API
      const result = await this.fetcher.sendMessage(conversationId, messageContent);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      // Find local conversation
      const conversation = await Conversation.findOne({
        conversationId: conversationId,
        userId: this.userId
      });

      if (conversation) {
        // Save message to local database
        const message = new Message({
          messageId: result.data.id || `local_${Date.now()}`,
          conversationId: conversationId,
          facebookConversationId: conversationId,
          pageId: this.pageId,
          userId: this.userId,
          senderId: this.pageId,
          senderName: 'Agent',
          senderType: 'agent',
          content: messageContent,
          sentAt: new Date(),
          deliveryStatus: 'sent'
        });

        await message.save();

        // Update conversation
        conversation.lastMessageContent = messageContent;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        return {
          success: true,
          data: {
            facebookResponse: result.data,
            localMessage: message
          }
        };
      }

      return {
        success: true,
        data: result.data
      };

    } catch (error) {
      console.error('Send message error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get local conversations with pagination
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Object} Conversations result
   */
  async getLocalConversations(page = 1, limit = 25) {
    try {
      const skip = (page - 1) * limit;
      
      const conversations = await Conversation.find({
        userId: this.userId,
        pageId: this.pageId
      })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'name email');

      const total = await Conversation.countDocuments({
        userId: this.userId,
        pageId: this.pageId
      });

      return {
        success: true,
        data: {
          conversations,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };

    } catch (error) {
      console.error('Get local conversations error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get local messages for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Object} Messages result
   */
  async getLocalMessages(conversationId, page = 1, limit = 25) {
    try {
      const skip = (page - 1) * limit;
      
      const messages = await Message.find({
        conversationId: conversationId,
        userId: this.userId
      })
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('readBy', 'name email');

      const total = await Message.countDocuments({
        conversationId: conversationId,
        userId: this.userId
      });

      return {
        success: true,
        data: {
          messages: messages.reverse(), // Reverse to show oldest first
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };

    } catch (error) {
      console.error('Get local messages error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process Facebook message attachments
   * @param {Object} attachments - Facebook attachments object
   * @returns {Array} Processed attachments
   */
  processAttachments(attachments) {
    if (!attachments || !attachments.data) return [];
    
    return attachments.data.map(attachment => ({
      type: attachment.type || 'file',
      url: attachment.image_data?.url || attachment.file_url || '',
      name: attachment.name || 'attachment',
      size: attachment.size || 0
    }));
  }

  /**
   * Determine message type from Facebook message
   * @param {Object} fbMessage - Facebook message object
   * @returns {string} Message type
   */
  determineMessageType(fbMessage) {
    if (fbMessage.attachments && fbMessage.attachments.data.length > 0) {
      const attachment = fbMessage.attachments.data[0];
      if (attachment.type === 'image') return 'image';
      if (attachment.type === 'video') return 'video';
      if (attachment.type === 'audio') return 'audio';
      return 'file';
    }
    
    if (fbMessage.sticker) return 'sticker';
    
    return 'text';
  }
}

module.exports = FacebookConversationService;
