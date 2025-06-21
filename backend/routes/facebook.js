const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const FacebookMessageFetcher = require('../api/fetch-messages');
const { verifyToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

// Validation for page access token
const validatePageToken = [
  body('pageAccessToken')
    .notEmpty()
    .withMessage('Page access token is required')
];

// @route   GET /api/facebook/conversations/:pageId
// @desc    Get all conversations for a Facebook page
// @access  Private
router.get('/conversations/:pageId', verifyToken, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { limit = 25, pageAccessToken } = req.query;

    if (!pageAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Page access token is required'
      });
    }

    const fetcher = new FacebookMessageFetcher(pageAccessToken);
    const result = await fetcher.fetchConversations(pageId, parseInt(limit));

    if (result.success) {
      res.json({
        success: true,
        message: 'Conversations fetched successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to fetch conversations',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching conversations'
    });
  }
});

// @route   GET /api/facebook/conversations/:conversationId/messages
// @desc    Get messages from a specific conversation
// @access  Private
router.get('/conversations/:conversationId/messages', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 25, pageAccessToken } = req.query;

    if (!pageAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Page access token is required'
      });
    }

    const fetcher = new FacebookMessageFetcher(pageAccessToken);
    const result = await fetcher.fetchMessages(conversationId, parseInt(limit));

    if (result.success) {
      res.json({
        success: true,
        message: 'Messages fetched successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to fetch messages',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages'
    });
  }
});

// @route   GET /api/facebook/user/:userId
// @desc    Get Facebook user profile
// @access  Private
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { pageAccessToken } = req.query;

    if (!pageAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Page access token is required'
      });
    }

    const fetcher = new FacebookMessageFetcher(pageAccessToken);
    const result = await fetcher.fetchUserProfile(userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'User profile fetched successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to fetch user profile',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile'
    });
  }
});

// @route   POST /api/facebook/conversations/:conversationId/send
// @desc    Send a message to a conversation
// @access  Private
router.post('/conversations/:conversationId/send', verifyToken, [
  body('message')
    .notEmpty()
    .withMessage('Message content is required'),
  body('pageAccessToken')
    .notEmpty()
    .withMessage('Page access token is required'),
  body('pageId')
    .optional()
], validateRequest, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message, pageAccessToken, pageId } = req.body;

    const fetcher = new FacebookMessageFetcher(pageAccessToken, pageId);
    const result = await fetcher.sendMessage(conversationId, message);

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

// @route   GET /api/facebook/page/:pageId
// @desc    Get Facebook page information
// @access  Private
router.get('/page/:pageId', verifyToken, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { pageAccessToken } = req.query;

    if (!pageAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Page access token is required'
      });
    }

    const fetcher = new FacebookMessageFetcher(pageAccessToken);
    const result = await fetcher.getPageInfo(pageId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Page information fetched successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to fetch page information',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get page info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching page information'
    });
  }
});

// @route   POST /api/facebook/test-connection
// @desc    Test Facebook page connection
// @access  Private
router.post('/test-connection', verifyToken, validatePageToken, validateRequest, async (req, res) => {
  try {
    const { pageAccessToken, pageId } = req.body;

    const fetcher = new FacebookMessageFetcher(pageAccessToken);
    const result = await fetcher.getPageInfo(pageId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Facebook page connection successful',
        data: {
          page: result.data,
          connectionStatus: 'connected'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to connect to Facebook page',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while testing connection'
    });
  }
});

module.exports = router;
