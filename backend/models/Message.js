const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  facebookConversationId: {
    type: String,
    required: true,
    index: true
  },
  pageId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    default: 'Unknown'
  },
  senderType: {
    type: String,
    enum: ['customer', 'agent', 'page'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'sticker', 'other'],
    default: 'text'
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video', 'file', 'audio']
    },
    url: String,
    name: String,
    size: Number
  }],
  sentAt: {
    type: Date,
    required: true,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deliveryStatus: {
    type: String,
    enum: ['sent', 'delivered', 'failed'],
    default: 'sent'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
messageSchema.index({ conversationId: 1, sentAt: -1 });
messageSchema.index({ userId: 1, sentAt: -1 });
messageSchema.index({ pageId: 1, sentAt: -1 });
messageSchema.index({ facebookConversationId: 1, sentAt: -1 });

// Instance method to mark as read
messageSchema.methods.markAsRead = function(userId) {
  this.isRead = true;
  this.readAt = new Date();
  this.readBy = userId;
  return this.save();
};

// Static method to find messages by conversation
messageSchema.statics.findByConversation = function(conversationId, limit = 25, before = null) {
  const query = { conversationId };
  
  if (before) {
    query.sentAt = { $lt: new Date(before) };
  }
  
  return this.find(query)
    .sort({ sentAt: -1 })
    .limit(limit)
    .populate('readBy', 'name email');
};

// Static method to get unread count for a user
messageSchema.statics.getUnreadCount = function(userId, pageId = null) {
  const query = { 
    userId,
    isRead: false,
    senderType: 'customer'
  };
  
  if (pageId) {
    query.pageId = pageId;
  }
  
  return this.countDocuments(query);
};

// Static method to mark multiple messages as read
messageSchema.statics.markMultipleAsRead = function(conversationId, userId) {
  return this.updateMany(
    { 
      conversationId,
      isRead: false,
      senderType: 'customer'
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
        readBy: userId
      }
    }
  );
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
