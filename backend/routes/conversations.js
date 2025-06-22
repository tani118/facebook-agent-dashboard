const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const FacebookConversationService = require('../services/FacebookConversationService');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { verifyToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

// Validation middleware
const validateConversationRequest = [
  body('pageAccessToken')
    .notEmpty()
    .withMessage('Page access token is required'),
  body('pageId')
    .notEmpty()
    .withMessage('Page ID is required')
];

const validateMessageRequest = [
  ...validateConversationRequest,
  body('message')
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 2000 })
    .withMessage('Message cannot exceed 2000 characters')
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// @route   POST /api/conversations/sync
// @desc    Sync conversations from Facebook
// @access  Private
router.post('/sync', verifyToken, validateConversationRequest, validateRequest, async (req, res) => {
  try {
    const { pageAccessToken, pageId, limit = 25 } = req.body;
    const userId = req.user._id;

    const service = new FacebookConversationService(pageAccessToken, userId, pageId);
    const result = await service.syncConversations(parseInt(limit));

    if (result.success) {
      res.json({
        success: true,
        message: `Successfully synced ${result.data.syncedCount} conversations`,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to sync conversations',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Sync conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during conversation sync'
    });
  }
});

// @route   POST /api/conversations/:conversationId/sync-messages
// @desc    Sync messages for a specific conversation
// @access  Private
router.post('/:conversationId/sync-messages', verifyToken, validateConversationRequest, validateRequest, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { pageAccessToken, pageId, limit = 25 } = req.body;
    const userId = req.user._id;

    console.log('🔄 Sync messages request:', {
      conversationId,
      pageId,
      hasPageAccessToken: !!pageAccessToken,
      pageAccessTokenLength: pageAccessToken?.length,
      userId,
      limit
    });

    const service = new FacebookConversationService(pageAccessToken, userId, pageId);
    const result = await service.syncMessages(conversationId, parseInt(limit));

    if (result.success) {
      res.json({
        success: true,
        message: `Successfully synced ${result.data.syncedCount} messages`,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to sync messages',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Sync messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during message sync'
    });
  }
});

// @route   GET /api/conversations
// @desc    Get local conversations with pagination
// @access  Private
router.get('/', verifyToken, validatePagination, validateRequest, async (req, res) => {
  try {
    const { page = 1, limit = 25, pageId } = req.query;
    const userId = req.user._id;

    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: 'Page ID is required'
      });
    }

    const service = new FacebookConversationService(null, userId, pageId);
    const result = await service.getLocalConversations(parseInt(page), parseInt(limit));

    if (result.success) {
      res.json({
        success: true,
        message: 'Conversations retrieved successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to retrieve conversations',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving conversations'
    });
  }
});

// @route   GET /api/conversations/:conversationId/messages
// @desc    Get messages for a specific conversation
// @access  Private
router.get('/:conversationId/messages', verifyToken, validatePagination, validateRequest, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 25, pageId } = req.query;
    const userId = req.user._id;

    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: 'Page ID is required'
      });
    }

    const service = new FacebookConversationService(null, userId, pageId);
    const result = await service.getLocalMessages(conversationId, parseInt(page), parseInt(limit));

    if (result.success) {
      // Mark messages as read
      await Message.markMultipleAsRead(conversationId, userId);
      
      res.json({
        success: true,
        message: 'Messages retrieved successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to retrieve messages',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving messages'
    });
  }
});

// @route   POST /api/conversations/:conversationId/send
// @desc    Send a message to a conversation
// @access  Private
router.post('/:conversationId/send', verifyToken, validateMessageRequest, validateRequest, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { pageAccessToken, pageId, message } = req.body;
    const userId = req.user._id;

    const service = new FacebookConversationService(pageAccessToken, userId, pageId);
    const result = await service.sendMessage(conversationId, message);

    if (result.success) {
      res.json({
        success: true,
        message: 'Message sent successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send message',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message'
    });
  }
});

// @route   PUT /api/conversations/:conversationId/assign
// @desc    Assign conversation to an agent
// @access  Private
router.put('/:conversationId/assign', verifyToken, [
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID')
], validateRequest, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { assignedTo } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      conversationId: conversationId,
      userId: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    conversation.assignedTo = assignedTo || null;
    await conversation.save();

    await conversation.populate('assignedTo', 'name email');

    res.json({
      success: true,
      message: assignedTo ? 'Conversation assigned successfully' : 'Conversation unassigned successfully',
      data: conversation
    });
  } catch (error) {
    console.error('Assign conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning conversation'
    });
  }
});

// @route   PUT /api/conversations/:conversationId/status
// @desc    Update conversation status
// @access  Private
router.put('/:conversationId/status', verifyToken, [
  body('status')
    .isIn(['active', 'archived', 'pending'])
    .withMessage('Invalid status')
], validateRequest, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      conversationId: conversationId,
      userId: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    conversation.status = status;
    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation status updated successfully',
      data: conversation
    });
  } catch (error) {
    console.error('Update conversation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating conversation status'
    });
  }
});

// @route   GET /api/conversations/stats
// @desc    Get conversation statistics
// @access  Private
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { pageId } = req.query;
    const userId = req.user._id;

    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: 'Page ID is required'
      });
    }

    const [
      totalConversations,
      activeConversations,
      pendingConversations,
      archivedConversations,
      unreadMessages
    ] = await Promise.all([
      Conversation.countDocuments({ userId, pageId }),
      Conversation.countDocuments({ userId, pageId, status: 'active' }),
      Conversation.countDocuments({ userId, pageId, status: 'pending' }),
      Conversation.countDocuments({ userId, pageId, status: 'archived' }),
      Message.getUnreadCount(userId, pageId)
    ]);

    res.json({
      success: true,
      data: {
        totalConversations,
        activeConversations,
        pendingConversations,
        archivedConversations,
        unreadMessages
      }
    });
  } catch (error) {
    console.error('Get conversation stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving statistics'
    });
  }
});

module.exports = router;
