const axios = require('axios');

class FacebookMessageFetcher {
  constructor(pageAccessToken) {
    this.pageAccessToken = pageAccessToken;
    this.baseURL = 'https://graph.facebook.com/v18.0';
  }

  /**
   * Fetch conversations for a Facebook page
   * @param {string} pageId - Facebook Page ID
   * @param {string} limit - Number of conversations to fetch
   * @returns {Object} Conversations data
   */
  async fetchConversations(pageId, limit = 25) {
    try {
      const url = `${this.baseURL}/${pageId}/conversations`;
      const response = await axios.get(url, {
        params: {
          access_token: this.pageAccessToken,
          limit: limit,
          fields: 'id,updated_time,message_count,unread_count,participants'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching conversations:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Fetch messages from a specific conversation
   * @param {string} conversationId - Facebook Conversation ID
   * @param {string} limit - Number of messages to fetch
   * @returns {Object} Messages data
   */
  async fetchMessages(conversationId, limit = 25) {
    try {
      const url = `${this.baseURL}/${conversationId}/messages`;
      const response = await axios.get(url, {
        params: {
          access_token: this.pageAccessToken,
          limit: limit,
          fields: 'id,created_time,from,to,message,attachments'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching messages:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Fetch user profile information
   * @param {string} userId - Facebook User ID
   * @returns {Object} User profile data
   */
  async fetchUserProfile(userId) {
    try {
      const url = `${this.baseURL}/${userId}`;
      const response = await axios.get(url, {
        params: {
          access_token: this.pageAccessToken,
          fields: 'id,name,first_name,last_name,profile_pic'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching user profile:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send a message to a conversation
   * @param {string} conversationId - Facebook Conversation ID
   * @param {string} message - Message text to send
   * @returns {Object} Send message response
   */
  async sendMessage(conversationId, message) {
    try {
      const url = `${this.baseURL}/${conversationId}/messages`;
      const response = await axios.post(url, {
        message: message,
        access_token: this.pageAccessToken
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get page information
   * @param {string} pageId - Facebook Page ID
   * @returns {Object} Page data
   */
  async getPageInfo(pageId) {
    try {
      const url = `${this.baseURL}/${pageId}`;
      const response = await axios.get(url, {
        params: {
          access_token: this.pageAccessToken,
          fields: 'id,name,picture,category,about'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching page info:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

module.exports = FacebookMessageFetcher;