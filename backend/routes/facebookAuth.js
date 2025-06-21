const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { 
  getLinkedPages, 
  getPageProfile, 
  getLongLivedUserToken,
  subscribeToWebhook
} = require('../utils/facebookUtils');

// @route   GET /api/facebook-auth/
// @desc    Initiate Facebook OAuth flow
// @access  Public
router.get('/', (req, res) => {
  console.log('=== OAUTH INITIATION ===');
  console.log('FACEBOOK_APP_ID:', process.env.FACEBOOK_APP_ID);
  console.log('BACKEND_URL:', process.env.BACKEND_URL);
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
  
  const facebookAuthUrl = `https://www.facebook.com/v23.0/dialog/oauth?` +
    `client_id=${process.env.FACEBOOK_APP_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.BACKEND_URL + '/api/facebook-auth/callback')}&` +
    `scope=pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging,business_management,pages_manage_engagement&` +
    `response_type=code&` +
    `state=${Math.random().toString(36).substring(7)}`;
  
  console.log('Generated OAuth URL:', facebookAuthUrl);
  res.redirect(facebookAuthUrl);
});

// @route   GET /api/facebook-auth/callback
// @desc    Handle Facebook OAuth callback
// @access  Public
router.get('/callback', async (req, res) => {
  console.log('=== OAUTH CALLBACK ===');
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers);
  
  try {
    const { code, error, error_description } = req.query;
    
    if (error) {
      console.error('Facebook OAuth error:', error_description);
      console.log('Redirecting to frontend with error:', `${process.env.FRONTEND_URL}?error=oauth_failed`);
      return res.redirect(`${process.env.FRONTEND_URL}?error=oauth_failed`);
    }
    
    if (!code) {
      console.log('No auth code received');
      console.log('Redirecting to frontend with error:', `${process.env.FRONTEND_URL}?error=no_auth_code`);
      return res.redirect(`${process.env.FRONTEND_URL}?error=no_auth_code`);
    }

    console.log('Auth code received:', code);
    
    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v23.0/oauth/access_token?` +
      `client_id=${process.env.FACEBOOK_APP_ID}&` +
      `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
      `redirect_uri=${encodeURIComponent(process.env.BACKEND_URL + '/api/facebook-auth/callback')}&` +
      `code=${code}`;
    
    console.log('Token exchange URL:', tokenUrl);
    
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();
    
    console.log('Token response:', tokenData);
    
    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error);
      console.log('Redirecting to frontend with error:', `${process.env.FRONTEND_URL}?error=token_exchange_failed`);
      return res.redirect(`${process.env.FRONTEND_URL}?error=token_exchange_failed`);
    }
    
    // Store token in session for later use AND pass it to frontend
    req.session.facebookToken = tokenData.access_token;
    console.log('Token stored in session');
    
    // For development, also pass the token as URL parameter (base64 encoded for basic security)
    const encodedToken = Buffer.from(tokenData.access_token).toString('base64');
    const successUrl = `${process.env.FRONTEND_URL}?facebook_auth=success&token=${encodedToken}`;
    console.log('Redirecting to frontend with success and token:', successUrl);
    res.redirect(successUrl);
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    console.log('Redirecting to frontend with error:', `${process.env.FRONTEND_URL}?error=oauth_callback_failed`);
    res.redirect(`${process.env.FRONTEND_URL}?error=oauth_callback_failed`);
  }
});

// @route   POST /api/facebook-auth/exchange-token
// @desc    Exchange short-lived token for long-lived token
// @access  Private
router.post('/exchange-token', verifyToken, [
  body('shortLivedToken')
    .notEmpty()
    .withMessage('Short-lived token is required')
], validateRequest, async (req, res) => {
  try {
    const { shortLivedToken } = req.body;

    const result = await getLongLivedUserToken(shortLivedToken);

    if (result.success) {
      res.json({
        success: true,
        message: 'Token exchanged successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to exchange token',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Exchange token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token exchange'
    });
  }
});

// @route   POST /api/facebook-auth/get-pages
// @desc    Get user's Facebook pages
// @access  Private
router.post('/get-pages', verifyToken, [
  body('userToken')
    .notEmpty()
    .withMessage('User access token is required')
], validateRequest, async (req, res) => {
  console.log('=== GET PAGES REQUEST ===');
  console.log('Headers:', req.headers);
  console.log('User from token:', req.user?._id);
  console.log('Body:', req.body);
  
  try {
    const { userToken } = req.body;

    console.log('Fetching pages with user token:', userToken.substring(0, 20) + '...');
    const pages = await getLinkedPages(userToken);

    console.log('Pages retrieved:', pages.length);
    res.json({
      success: true,
      message: 'Pages retrieved successfully',
      data: {
        pages: pages,
        count: pages.length
      }
    });
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pages'
    });
  }
});

// @route   POST /api/facebook-auth/connect-page
// @desc    Connect a Facebook page to user account
// @access  Private
router.post('/connect-page', verifyToken, [
  body('pageId')
    .notEmpty()
    .withMessage('Page ID is required'),
  body('pageName')
    .notEmpty()
    .withMessage('Page name is required'),
  body('userToken')
    .notEmpty()
    .withMessage('User access token is required')
], validateRequest, async (req, res) => {
  try {
    const { pageId, pageName, userToken } = req.body;
    const userId = req.user._id;

    // Get page profile and generate page access token
    const pageProfile = await getPageProfile(pageName, pageId, userToken);

    // Save page connection to user
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if page already connected
    const existingPage = user.facebookPages?.find(page => page.pageId === pageId);
    
    if (existingPage) {
      // Update existing page
      existingPage.pageName = pageName;
      existingPage.pageAccessToken = pageProfile.pageToken;
      existingPage.connectedAt = new Date();
      existingPage.picture = pageProfile.picture;
    } else {
      // Add new page
      if (!user.facebookPages) {
        user.facebookPages = [];
      }
      
      user.facebookPages.push({
        pageId: pageId,
        pageName: pageName,
        pageAccessToken: pageProfile.pageToken,
        picture: pageProfile.picture,
        about: pageProfile.about,
        category: pageProfile.category,
        fanCount: pageProfile.fanCount,
        website: pageProfile.website,
        connectedAt: new Date()
      });
    }

    await user.save();

    // Subscribe to webhook for this page
    try {
      const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/webhook/webhook`;
      await subscribeToWebhook(pageId, pageProfile.pageToken, webhookUrl);
      console.log('Webhook subscribed for page:', pageId);
    } catch (webhookError) {
      console.error('Webhook subscription failed:', webhookError);
      // Don't fail the whole operation if webhook subscription fails
    }

    res.json({
      success: true,
      message: 'Page connected successfully',
      data: {
        pageId: pageId,
        pageName: pageName,
        picture: pageProfile.picture,
        connectedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Connect page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while connecting page'
    });
  }
});

// @route   DELETE /api/facebook-auth/disconnect-page/:pageId
// @desc    Disconnect a Facebook page from user account
// @access  Private
router.delete('/disconnect-page/:pageId', verifyToken, async (req, res) => {
  try {
    const { pageId } = req.params;
    const userId = req.user._id;

    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove page from user's connected pages
    if (user.facebookPages) {
      user.facebookPages = user.facebookPages.filter(page => page.pageId !== pageId);
      await user.save();
    }

    // Archive or delete conversations for this page
    const Conversation = require('../models/Conversation');
    await Conversation.updateMany(
      { userId: userId, pageId: pageId },
      { status: 'archived' }
    );

    res.json({
      success: true,
      message: 'Page disconnected successfully'
    });

  } catch (error) {
    console.error('Disconnect page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while disconnecting page'
    });
  }
});

// @route   GET /api/facebook-auth/connected-pages
// @desc    Get user's connected Facebook pages
// @access  Private
router.get('/connected-pages', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const User = require('../models/User');
    const user = await User.findById(userId).select('facebookPages');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const connectedPages = user.facebookPages || [];

    res.json({
      success: true,
      message: 'Connected pages retrieved successfully',
      data: {
        pages: connectedPages.map(page => ({
          pageId: page.pageId,
          pageName: page.pageName,
          picture: page.picture,
          about: page.about,
          category: page.category,
          fanCount: page.fanCount,
          website: page.website,
          connectedAt: page.connectedAt
        })),
        count: connectedPages.length
      }
    });

  } catch (error) {
    console.error('Get connected pages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching connected pages'
    });
  }
});

// @route   POST /api/facebook-auth/refresh-page-token
// @desc    Refresh page access token
// @access  Private
router.post('/refresh-page-token', verifyToken, [
  body('pageId')
    .notEmpty()
    .withMessage('Page ID is required'),
  body('userToken')
    .notEmpty()
    .withMessage('User access token is required')
], validateRequest, async (req, res) => {
  try {
    const { pageId, userToken } = req.body;
    const userId = req.user._id;

    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the page in user's connected pages
    const pageIndex = user.facebookPages?.findIndex(page => page.pageId === pageId);
    
    if (pageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Page not found in connected pages'
      });
    }

    const connectedPage = user.facebookPages[pageIndex];

    // Get new page profile with refreshed token
    const pageProfile = await getPageProfile(connectedPage.pageName, pageId, userToken);

    // Update the token
    user.facebookPages[pageIndex].pageAccessToken = pageProfile.pageToken;
    user.facebookPages[pageIndex].connectedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Page token refreshed successfully',
      data: {
        pageId: pageId,
        refreshedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Refresh page token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while refreshing page token'
    });
  }
});

// @route   GET /api/facebook-auth/session-token
// @desc    Get Facebook token from session (after OAuth callback)
// @access  Public (but requires session)
router.get('/session-token', (req, res) => {
  console.log('=== GET SESSION TOKEN ===');
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Facebook token in session:', req.session.facebookToken);
  
  if (req.session.facebookToken) {
    const token = req.session.facebookToken;
    // Clear the token from session after retrieving it
    delete req.session.facebookToken;
    
    res.json({
      success: true,
      message: 'Facebook token retrieved from session',
      data: {
        facebookToken: token
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'No Facebook token found in session'
    });
  }
});

module.exports = router;
