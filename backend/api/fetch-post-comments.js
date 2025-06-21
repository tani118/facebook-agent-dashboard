// filepath: /home/lakshya/Desktop/rich-panel/v3/facebook-agent-dashboard/backend/api/fetch-post-comments.js
const axios = require('axios');

class FacebookPostCommentsFetcher {
  constructor(pageAccessToken) {
    this.pageAccessToken = pageAccessToken;
    this.baseURL = 'https://graph.facebook.com/v23.0';
  }

  /**
   * Fetch posts from a Facebook page
   * @param {string} pageId - Facebook Page ID
   * @param {string} limit - Number of posts to fetch (default: 25)
   * @param {string} since - Unix timestamp to fetch posts since
   * @param {string} until - Unix timestamp to fetch posts until
   * @returns {Object} Posts data
   */
  async fetchPagePosts(pageId, limit = 25, since = null, until = null) {
    try {
      const url = `${this.baseURL}/${pageId}/posts`;
      const params = {
        access_token: this.pageAccessToken,
        limit: limit,
        fields: 'id,message,created_time,updated_time,story,full_picture,permalink_url,status_type,type,from,comments_count,likes_count,reactions_count,shares_count'
      };

      if (since) params.since = since;
      if (until) params.until = until;

      const response = await axios.get(url, { params });

      return {
        success: true,
        data: response.data,
        paging: response.data.paging
      };
    } catch (error) {
      console.error('Error fetching page posts:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Fetch comments for a specific post
   * @param {string} postId - Facebook Post ID
   * @param {string} limit - Number of comments to fetch (default: 25)
   * @param {string} order - Order of comments ('chronological' or 'reverse_chronological')
   * @param {boolean} includeReplies - Whether to include comment replies
   * @returns {Object} Comments data
   */
  async fetchPostComments(postId, limit = 25, order = 'chronological', includeReplies = true) {
    try {
      const url = `${this.baseURL}/${postId}/comments`;
      const params = {
        access_token: this.pageAccessToken,
        limit: limit,
        order: order,
        fields: 'id,message,created_time,from,attachment,like_count,comment_count,parent,user_likes,can_reply_privately'
      };

      // Include comment replies if requested
      if (includeReplies) {
        params.fields += ',comments{id,message,created_time,from,attachment,like_count,parent}';
      }

      const response = await axios.get(url, { params });

      return {
        success: true,
        data: response.data,
        paging: response.data.paging
      };
    } catch (error) {
      console.error('Error fetching post comments:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Fetch a specific comment with full details
   * @param {string} commentId - Facebook Comment ID
   * @returns {Object} Comment data
   */
  async fetchComment(commentId) {
    try {
      const url = `${this.baseURL}/${commentId}`;
      const response = await axios.get(url, {
        params: {
          access_token: this.pageAccessToken,
          fields: 'id,message,created_time,from,attachment,like_count,comment_count,parent,user_likes,can_reply_privately,permalink_url'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching comment:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Reply to a comment
   * @param {string} commentId - Comment ID to reply to
   * @param {string} message - Reply message
   * @returns {Object} Reply response
   */
  async replyToComment(commentId, message) {
    try {
      const url = `${this.baseURL}/${commentId}/comments`;
      const response = await axios.post(url, {
        message: message,
        access_token: this.pageAccessToken
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error replying to comment:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send a private message to comment author
   * @param {string} commentId - Comment ID
   * @param {string} message - Private message text
   * @returns {Object} Private message response
   */
  async sendPrivateMessage(commentId, message) {
    try {
      const url = `${this.baseURL}/${commentId}/private_replies`;
      const response = await axios.post(url, {
        message: message,
        access_token: this.pageAccessToken
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error sending private message:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Hide/unhide a comment
   * @param {string} commentId - Comment ID
   * @param {boolean} hide - Whether to hide (true) or unhide (false) the comment
   * @returns {Object} Hide/unhide response
   */
  async hideComment(commentId, hide = true) {
    try {
      const url = `${this.baseURL}/${commentId}`;
      const response = await axios.post(url, {
        is_hidden: hide,
        access_token: this.pageAccessToken
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error hiding/unhiding comment:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Delete a comment
   * @param {string} commentId - Comment ID to delete
   * @returns {Object} Delete response
   */
  async deleteComment(commentId) {
    try {
      const url = `${this.baseURL}/${commentId}`;
      const response = await axios.delete(url, {
        params: {
          access_token: this.pageAccessToken
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error deleting comment:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Like/unlike a comment
   * @param {string} commentId - Comment ID
   * @param {boolean} like - Whether to like (true) or unlike (false) the comment
   * @returns {Object} Like/unlike response
   */
  async likeComment(commentId, like = true) {
    try {
      const url = `${this.baseURL}/${commentId}/likes`;
      let response;

      if (like) {
        response = await axios.post(url, {
          access_token: this.pageAccessToken
        });
      } else {
        response = await axios.delete(url, {
          params: {
            access_token: this.pageAccessToken
          }
        });
      }

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error liking/unliking comment:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get comment insights (if available)
   * @param {string} commentId - Comment ID
   * @returns {Object} Comment insights data
   */
  async getCommentInsights(commentId) {
    try {
      const url = `${this.baseURL}/${commentId}/insights`;
      const response = await axios.get(url, {
        params: {
          access_token: this.pageAccessToken,
          metric: 'comment_replies_count,comment_reactions_count'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching comment insights:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Search comments by keyword
   * @param {string} postId - Post ID to search within
   * @param {string} keyword - Keyword to search for
   * @param {number} limit - Number of results to return
   * @returns {Object} Search results
   */
  async searchComments(postId, keyword, limit = 10) {
    try {
      const commentsResult = await this.fetchPostComments(postId, 100); // Fetch more comments for search
      
      if (!commentsResult.success) {
        return commentsResult;
      }

      const filteredComments = commentsResult.data.data.filter(comment => 
        comment.message && comment.message.toLowerCase().includes(keyword.toLowerCase())
      ).slice(0, limit);

      return {
        success: true,
        data: {
          data: filteredComments,
          keyword: keyword,
          total_matches: filteredComments.length
        }
      };
    } catch (error) {
      console.error('Error searching comments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get comment author profile
   * @param {string} userId - User ID from comment
   * @returns {Object} User profile data
   */
  async getCommentAuthorProfile(userId) {
    try {
      const url = `${this.baseURL}/${userId}`;
      const response = await axios.get(url, {
        params: {
          access_token: this.pageAccessToken,
          fields: 'id,name,first_name,last_name,picture'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching comment author profile:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Batch process multiple comments (reply, hide, etc.)
   * @param {Array} operations - Array of operations to perform
   * @returns {Object} Batch operation results
   */
  async batchProcessComments(operations) {
    try {
      const results = [];
      
      for (const operation of operations) {
        let result;
        
        switch (operation.action) {
          case 'reply':
            result = await this.replyToComment(operation.commentId, operation.message);
            break;
          case 'hide':
            result = await this.hideComment(operation.commentId, operation.hide);
            break;
          case 'delete':
            result = await this.deleteComment(operation.commentId);
            break;
          case 'like':
            result = await this.likeComment(operation.commentId, operation.like);
            break;
          case 'private_message':
            result = await this.sendPrivateMessage(operation.commentId, operation.message);
            break;
          default:
            result = { success: false, error: 'Unknown action' };
        }
        
        results.push({
          operation: operation,
          result: result
        });
      }

      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('Error in batch processing comments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = FacebookPostCommentsFetcher;