const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const FacebookPostCommentsFetcher = require('../api/fetch-post-comments');
const User = require('../models/User');

/**
 * Get all posts for a Facebook page
 * GET /api/posts/:pageId
 */
router.get('/:pageId', verifyToken, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { limit = 25, since, until, pageAccessToken } = req.query;

    // Find user and get page access token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let accessToken = pageAccessToken; // Use token from query if provided

    // If no token in query, try to find it from user's pages
    if (!accessToken) {
      const page = user.facebookPages.find(p => p.pageId === pageId);
      if (!page) {
        return res.status(404).json({ error: 'Page not found for this user and no pageAccessToken provided' });
      }
      accessToken = page.pageAccessToken;
    }

    if (!accessToken) {
      return res.status(400).json({ error: 'Page access token is required' });
    }

    const fetcher = new FacebookPostCommentsFetcher(accessToken);
    const result = await fetcher.fetchPagePosts(pageId, limit, since, until);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      posts: result.data.data,
      paging: result.paging
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get comments for a specific post
 * GET /api/posts/:pageId/:postId/comments
 */
router.get('/:pageId/:postId/comments', verifyToken, async (req, res) => {
  try {
    const { pageId, postId } = req.params;
    const { limit = 25, order = 'chronological', includeReplies = 'true', pageAccessToken } = req.query;

    // Find user and get page access token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let accessToken = pageAccessToken; // Use token from query if provided

    // If no token in query, try to find it from user's pages
    if (!accessToken) {
      const page = user.facebookPages.find(p => p.pageId === pageId);
      if (!page) {
        return res.status(404).json({ error: 'Page not found for this user and no pageAccessToken provided' });
      }
      accessToken = page.pageAccessToken;
    }

    if (!accessToken) {
      return res.status(400).json({ error: 'Page access token is required' });
    }

    const fetcher = new FacebookPostCommentsFetcher(accessToken);
    const result = await fetcher.fetchPostComments(
      postId, 
      limit, 
      order, 
      includeReplies === 'true'
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      comments: result.data.data,
      paging: result.paging
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a specific comment
 * GET /api/posts/:pageId/comments/:commentId
 */
router.get('/:pageId/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const { pageId, commentId } = req.params;

    // Find user and get page access token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const page = user.facebookPages.find(p => p.pageId === pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found for this user' });
    }

    const fetcher = new FacebookPostCommentsFetcher(page.pageAccessToken);
    const result = await fetcher.fetchComment(commentId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      comment: result.data
    });
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Reply to a comment
 * POST /api/posts/:pageId/comments/:commentId/reply
 */
router.post('/:pageId/comments/:commentId/reply', verifyToken, async (req, res) => {
  try {
    const { pageId, commentId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Find user and get page access token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const page = user.facebookPages.find(p => p.pageId === pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found for this user' });
    }

    const fetcher = new FacebookPostCommentsFetcher(page.pageAccessToken);
    const result = await fetcher.replyToComment(commentId, message);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      reply: result.data
    });
  } catch (error) {
    console.error('Error replying to comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Send private message to comment author
 * POST /api/posts/:pageId/comments/:commentId/private-message
 */
router.post('/:pageId/comments/:commentId/private-message', verifyToken, async (req, res) => {
  try {
    const { pageId, commentId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Find user and get page access token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const page = user.facebookPages.find(p => p.pageId === pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found for this user' });
    }

    const fetcher = new FacebookPostCommentsFetcher(page.pageAccessToken);
    const result = await fetcher.sendPrivateMessage(commentId, message);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      privateMessage: result.data
    });
  } catch (error) {
    console.error('Error sending private message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Hide/unhide a comment
 * POST /api/posts/:pageId/comments/:commentId/hide
 */
router.post('/:pageId/comments/:commentId/hide', verifyToken, async (req, res) => {
  try {
    const { pageId, commentId } = req.params;
    const { hide = true } = req.body;

    // Find user and get page access token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const page = user.facebookPages.find(p => p.pageId === pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found for this user' });
    }

    const fetcher = new FacebookPostCommentsFetcher(page.pageAccessToken);
    const result = await fetcher.hideComment(commentId, hide);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: hide ? 'Comment hidden successfully' : 'Comment unhidden successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error hiding/unhiding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a comment
 * DELETE /api/posts/:pageId/comments/:commentId
 */
router.delete('/:pageId/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const { pageId, commentId } = req.params;

    // Find user and get page access token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const page = user.facebookPages.find(p => p.pageId === pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found for this user' });
    }

    const fetcher = new FacebookPostCommentsFetcher(page.pageAccessToken);
    const result = await fetcher.deleteComment(commentId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Like/unlike a comment
 * POST /api/posts/:pageId/comments/:commentId/like
 */
router.post('/:pageId/comments/:commentId/like', verifyToken, async (req, res) => {
  try {
    const { pageId, commentId } = req.params;
    const { like = true } = req.body;

    // Find user and get page access token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const page = user.facebookPages.find(p => p.pageId === pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found for this user' });
    }

    const fetcher = new FacebookPostCommentsFetcher(page.pageAccessToken);
    const result = await fetcher.likeComment(commentId, like);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: like ? 'Comment liked successfully' : 'Comment unliked successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error liking/unliking comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Search comments by keyword
 * GET /api/posts/:pageId/:postId/comments/search
 */
router.get('/:pageId/:postId/comments/search', verifyToken, async (req, res) => {
  try {
    const { pageId, postId } = req.params;
    const { keyword, limit = 10 } = req.query;

    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({ error: 'Keyword is required for search' });
    }

    // Find user and get page access token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const page = user.facebookPages.find(p => p.pageId === pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found for this user' });
    }

    const fetcher = new FacebookPostCommentsFetcher(page.pageAccessToken);
    const result = await fetcher.searchComments(postId, keyword, parseInt(limit));

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      searchResults: result.data
    });
  } catch (error) {
    console.error('Error searching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Batch process comments
 * POST /api/posts/:pageId/comments/batch
 */
router.post('/:pageId/comments/batch', verifyToken, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { operations } = req.body;

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ error: 'Operations array is required' });
    }

    // Find user and get page access token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const page = user.facebookPages.find(p => p.pageId === pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found for this user' });
    }

    const fetcher = new FacebookPostCommentsFetcher(page.pageAccessToken);
    const result = await fetcher.batchProcessComments(operations);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      batchResults: result.data
    });
  } catch (error) {
    console.error('Error in batch processing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get comment author profile
 * GET /api/posts/:pageId/comments/:commentId/author
 */
router.get('/:pageId/comments/:commentId/author', verifyToken, async (req, res) => {
  try {
    const { pageId, commentId } = req.params;

    // Find user and get page access token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const page = user.facebookPages.find(p => p.pageId === pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found for this user' });
    }

    const fetcher = new FacebookPostCommentsFetcher(page.pageAccessToken);
    
    // First get the comment to get the author ID
    const commentResult = await fetcher.fetchComment(commentId);
    if (!commentResult.success) {
      return res.status(400).json({ error: commentResult.error });
    }

    const authorId = commentResult.data.from.id;
    const profileResult = await fetcher.getCommentAuthorProfile(authorId);

    if (!profileResult.success) {
      return res.status(400).json({ error: profileResult.error });
    }

    res.json({
      success: true,
      author: profileResult.data
    });
  } catch (error) {
    console.error('Error fetching comment author:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
