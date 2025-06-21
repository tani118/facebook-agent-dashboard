const axios = require('axios');

class FacebookMessageFetcher {
  constructor(pageAccessToken, pageId = null) {
    this.pageAccessToken = pageAccessToken;
    this.pageId = pageId;
    this.baseURL = 'https://graph.facebook.com/v23.0';
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
   * For Facebook pages, we need to extract the user ID from the conversation
   * and send the message to that user ID using the page's messages endpoint
   * @param {string} conversationIdOrUserId - Facebook Conversation ID or User ID  
   * @param {string} message - Message text to send
   * @returns {Object} Send message response
   */
  async sendMessage(conversationIdOrUserId, message) {
    try {
      let recipientId = conversationIdOrUserId;
      
      // If it's a conversation ID (starts with 't_'), we need to get the user ID
      if (conversationIdOrUserId.startsWith('t_')) {
        // First, fetch the conversation to get participant details
        const conversationUrl = `${this.baseURL}/${conversationIdOrUserId}`;
        const conversationResponse = await axios.get(conversationUrl, {
          params: {
            access_token: this.pageAccessToken,
            fields: 'participants'
          }
        });
        
        // Find the user participant (not the page)
        const participants = conversationResponse.data.participants?.data || [];
        const userParticipant = participants.find(p => p.id !== this.pageId);
        
        if (!userParticipant) {
          throw new Error('Could not find user participant in conversation');
        }
        
        recipientId = userParticipant.id;
      }
      
      // Use the page's messages endpoint to send a message to the user
      const pageId = this.pageId || '666760583189727'; // Fallback to known page ID
      const url = `${this.baseURL}/${pageId}/messages`;
      
      const response = await axios.post(url, {
        recipient: {
          id: recipientId
        },
        message: {
          text: message
        },
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