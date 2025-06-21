const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const FacebookPostCommentsFetcher = require('../api/fetch-post-comments');
const User = require('../models/User');

/**
 * Get all comments across all posts for a page, grouped by user
 * GET /api/comments/:pageId/all
 */
router.get('/:pageId/all', verifyToken, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { limit = 50, pageAccessToken } = req.query;

    // Find user and get page access token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let accessToken = pageAccessToken;
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
    
    // First, get all posts
    const postsResult = await fetcher.fetchPagePosts(pageId, 25);
    if (!postsResult.success) {
      return res.status(400).json({ error: 'Failed to fetch posts: ' + postsResult.error });
    }

    const posts = postsResult.data.data || [];
    const allComments = [];

    // Get comments for each post
    for (const post of posts) {
      try {
        const commentsResult = await fetcher.fetchPostComments(
          post.id, 
          25, // Get up to 25 comments per post
          'reverse_chronological', // Newest first
          true // Include replies
        );

        if (commentsResult.success && commentsResult.data.data) {
          // Process comments and their replies
          const processCommentsRecursively = (comments, postInfo) => {
            const processedComments = [];
            
            comments.forEach(comment => {
              // Add the main comment
              processedComments.push({
                ...comment,
                ...postInfo
              });
              
              // Add any replies to this comment
              if (comment.comments && comment.comments.data) {
                const replies = comment.comments.data.map(reply => ({
                  ...reply,
                  ...postInfo,
                  parentCommentId: comment.id,
                  isReply: true
                }));
                processedComments.push(...replies);
              }
            });
            
            return processedComments;
          };

          const postInfo = {
            postId: post.id,
            postMessage: post.message || 'No message',
            postCreatedTime: post.created_time,
            postUrl: `https://facebook.com/${post.id}`
          };

          const commentsWithReplies = processCommentsRecursively(commentsResult.data.data, postInfo);
          allComments.push(...commentsWithReplies);
        }
      } catch (error) {
        console.error(`Error fetching comments for post ${post.id}:`, error);
        // Continue with other posts even if one fails
      }
    }

    // Group comments by user
    const commentsByUser = {};
    
    allComments.forEach(comment => {
      const userId = comment.from.id;
      const userName = comment.from.name;
      
      if (!commentsByUser[userId]) {
        commentsByUser[userId] = {
          userId: userId,
          userName: userName,
          userPicture: comment.from.picture?.data?.url || null,
          totalComments: 0,
          comments: []
        };
      }
      
      commentsByUser[userId].totalComments++;
      commentsByUser[userId].comments.push({
        commentId: comment.id,
        message: comment.message,
        createdTime: comment.created_time,
        likeCount: comment.like_count || 0,
        replyCount: comment.comment_count || 0,
        postId: comment.postId,
        postMessage: comment.postMessage,
        postCreatedTime: comment.postCreatedTime,
        postUrl: comment.postUrl,
        canReplyPrivately: comment.can_reply_privately !== false,
        permalinkUrl: comment.permalink_url
      });
    });

    // Convert to array and sort by most recent comment
    const userComments = Object.values(commentsByUser).map(userGroup => {
      // Sort user's comments by newest first
      userGroup.comments.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
      
      // Add most recent comment time for sorting users
      userGroup.lastCommentTime = userGroup.comments[0]?.createdTime;
      
      return userGroup;
    });

    // Sort users by their most recent comment
    userComments.sort((a, b) => new Date(b.lastCommentTime) - new Date(a.lastCommentTime));

    res.json({
      success: true,
      data: {
        totalUsers: userComments.length,
        totalComments: allComments.length,
        totalPosts: posts.length,
        userComments: userComments
      }
    });

  } catch (error) {
    console.error('Error fetching all comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Reply to a specific comment publicly
 * POST /api/comments/:pageId/:commentId/reply
 */
router.post('/:pageId/:commentId/reply', verifyToken, async (req, res) => {
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
      message: 'Reply posted successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error replying to comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Send private message to comment author (moves to messenger)
 * POST /api/comments/:pageId/:commentId/private-message
 */
router.post('/:pageId/:commentId/private-message', verifyToken, async (req, res) => {
  try {
    const { pageId, commentId } = req.params;
    const { message, authorId, authorName } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!authorId || !authorName) {
      return res.status(400).json({ error: 'Author ID and name are required' });
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

    // Send private message via Facebook Messenger API
    const FacebookMessageFetcher = require('../api/fetch-messages');
    const messageFetcher = new FacebookMessageFetcher(page.pageAccessToken, pageId);
    
    console.log(`Sending message to recipient ${authorId} via page ${pageId}`);
    const messageResult = await messageFetcher.sendMessage(authorId, message);

    if (!messageResult.success) {
      return res.status(400).json({ error: 'Failed to send private message: ' + messageResult.error });
    }

    // Create or update conversation in local database
    const Conversation = require('../models/Conversation');
    let conversation = await Conversation.findOne({
      pageId: pageId,
      customerId: authorId,
      userId: user._id
    });

    if (!conversation) {
      conversation = new Conversation({
        conversationId: `${pageId}_${authorId}_${Date.now()}`,
        pageId: pageId,
        customerId: authorId,
        customerName: authorName,
        userId: user._id,
        lastMessageAt: new Date(),
        lastMessageContent: message,
        status: 'active',
        unreadCount: 0,
        source: 'comment_private_reply'
      });
      await conversation.save();
    } else {
      conversation.lastMessageAt = new Date();
      conversation.lastMessageContent = message;
      conversation.unreadCount = 0;
      await conversation.save();
    }

    // Save the message to local database
    const Message = require('../models/Message');
    const newMessage = new Message({
      messageId: messageResult.data.message_id || `local_${Date.now()}`,
      conversationId: conversation.conversationId,
      facebookConversationId: conversation.conversationId, // Use the same ID
      pageId: pageId,
      senderId: pageId,
      senderName: page.pageName || 'Page Admin',
      senderType: 'page', // This is a page sending to customer
      content: message,
      messageType: 'text',
      direction: 'outgoing',
      sentAt: new Date(),
      userId: user._id,
      source: 'comment_private_reply'
    });
    await newMessage.save();

    // Emit real-time update if WebSocket is available
    if (global.io) {
      global.io.to(`user-${user._id}`).emit('new-message', {
        conversationId: conversation.conversationId,
        message: {
          messageId: newMessage.messageId,
          senderId: pageId,
          senderName: newMessage.senderName,
          content: message,
          timestamp: newMessage.sentAt,
          type: 'outgoing'
        },
        conversation: {
          conversationId: conversation.conversationId,
          customerName: authorName,
          lastMessageContent: message,
          lastMessageAt: new Date(),
          unreadCount: 0
        }
      });
    }

    res.json({
      success: true,
      message: 'Private message sent successfully. User moved to messenger.',
      data: {
        messageId: messageResult.data.message_id,
        conversationId: conversation.conversationId,
        authorId: authorId,
        authorName: authorName
      }
    });

  } catch (error) {
    console.error('Error sending private message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
