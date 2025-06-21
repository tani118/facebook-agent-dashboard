const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  facebookConversationId: {
    type: String,
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
  customerId: {
    type: String,
    required: true,
    index: true
  },
  customerName: {
    type: String,
    default: 'Unknown'
  },
  customerProfilePic: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastMessageContent: {
    type: String,
    default: ''
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'pending'],
    default: 'active'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
conversationSchema.index({ userId: 1, pageId: 1 });
conversationSchema.index({ userId: 1, lastMessageAt: -1 });
conversationSchema.index({ customerId: 1, pageId: 1 });

// Instance method to update last message
conversationSchema.methods.updateLastMessage = function(messageContent) {
  this.lastMessageAt = new Date();
  this.lastMessageContent = messageContent;
  return this.save();
};

// Static method to find conversations by user and page
conversationSchema.statics.findByUserAndPage = function(userId, pageId, limit = 25) {
  return this.find({ userId, pageId })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .populate('assignedTo', 'name email');
};

// Static method to check if conversation should be new (24 hour rule)
conversationSchema.statics.shouldCreateNewConversation = function(lastMessageDate) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return new Date(lastMessageDate) < twentyFourHoursAgo;
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
