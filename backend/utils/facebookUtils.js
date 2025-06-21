const axios = require('axios');

/**
 * Get all pages linked to a user account
 * @param {string} userToken - User access token
 * @returns {Array} Array of page objects with name and id
 */
const getLinkedPages = async (userToken) => {
  try {
    const { data: pageRecord } = await axios.get(
      "https://graph.facebook.com/me/accounts",
      {
        params: {
          access_token: userToken,
        },
      }
    );

    return pageRecord.data?.map((page) => ({ 
      name: page.name, 
      id: page.id,
      accessToken: page.access_token,
      category: page.category,
      tasks: page.tasks
    })) || [];
  } catch (error) {
    console.error('Error fetching linked pages:', error.response?.data || error.message);
    throw new Error('Failed to fetch linked pages');
  }
};

/**
 * Get customer profile information
 * @param {string} customerId - Facebook customer ID (PSID)
 * @param {string} pageToken - Page access token
 * @returns {Object} Customer profile data
 */
const getCustomerProfile = async (customerId, pageToken) => {
  const data = {
    firstname: "Anonymous",
    lastname: "",
    img: "https://eu.ui-avatars.com/api/?name=Anonymous&size=460",
    timezone: "-",
    gender: "-",
  };

  try {
    const response = await axios.get(
      `https://graph.facebook.com/${customerId}`,
      {
        params: {
          fields: "first_name,last_name,gender,timezone,profile_pic",
          access_token: pageToken,
        },
      }
    );

    const { first_name, last_name, timezone, gender, profile_pic } = response.data;
    setValue(data, "firstname", first_name);
    setValue(data, "lastname", last_name);
    setValue(data, "img", profile_pic || customProfile(first_name + " " + last_name));
    setValue(data, "timezone", timezone);
    setValue(data, "gender", gender);
  } catch (err) {
    console.log('Error fetching customer profile:', err.message);
  }
  return data;
};

/**
 * Generate a custom profile image URL using UI Avatars
 * @param {string} name - Full name for avatar
 * @returns {string} Avatar URL
 */
const customProfile = (name) => {
  const encodedName = encodeURIComponent(name);
  return `https://eu.ui-avatars.com/api/?name=${encodedName}&size=460&background=4267B2&color=fff`;
};

/**
 * Get page profile information and generate long-lived page access token
 * @param {string} pageName - Page name
 * @param {string} pageId - Page ID
 * @param {string} userToken - User access token
 * @returns {Object} Page profile with token and picture
 */
const getPageProfile = async (pageName, pageId, userToken) => {
  const generatePageToken = async () => {
    try {
      // Exchange user token for long-lived token
      const { data: longLiveData } = await axios.get(
        "https://graph.facebook.com/v23.0/oauth/access_token",
        {
          params: {
            grant_type: "fb_exchange_token",
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            fb_exchange_token: userToken,
          },
        }
      );

      // Get pages with long-lived token
      const { data: pages_ } = await axios.get(
        "https://graph.facebook.com/me/accounts",
        {
          params: {
            access_token: longLiveData.access_token,
          },
        }
      );

      const pagesList = pages_.data;
      let accessToken;
      
      if (pagesList) {
        pagesList.forEach((page) => {
          if (page.id === pageId) {
            accessToken = page.access_token;
          }
        });
      }

      if (accessToken) {
        return accessToken;
      } else {
        throw new Error("Unable to access the page");
      }
    } catch (error) {
      console.error('Error generating page token:', error.response?.data || error.message);
      throw error;
    }
  };

  try {
    const pageToken = await generatePageToken();
    
    // Get page picture
    const { data: picture_ } = await axios.get(
      `https://graph.facebook.com/v23.0/${pageId}`,
      {
        params: {
          fields: "picture,about,category,fan_count,website",
          access_token: pageToken,
        },
      }
    );
    
    const picture = picture_.picture?.data?.url;

    return {
      pageName,
      pageToken,
      picture,
      about: picture_.about,
      category: picture_.category,
      fanCount: picture_.fan_count,
      website: picture_.website
    };
  } catch (error) {
    console.error('Error getting page profile:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Send a message to a specific person using Send API
 * @param {string} pageId - Page ID
 * @param {string} recipientId - Recipient PSID
 * @param {string} messageText - Message text
 * @param {string} pageAccessToken - Page access token
 * @returns {Object} Send API response
 */
const sendMessageToPerson = async (pageId, recipientId, messageText, pageAccessToken) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${pageId}/messages`,
      {
        recipient: {
          id: recipientId
        },
        messaging_type: "RESPONSE",
        message: {
          text: messageText
        }
      },
      {
        params: {
          access_token: pageAccessToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

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
};

/**
 * Get comments for a page post
 * @param {string} postId - Post ID
 * @param {string} pageAccessToken - Page access token
 * @returns {Object} Comments data
 */
const getPostComments = async (postId, pageAccessToken) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${postId}/comments`,
      {
        params: {
          fields: "from,message,created_time,attachment,like_count,comment_count",
          access_token: pageAccessToken
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching comments:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Reply to a comment
 * @param {string} commentId - Comment ID to reply to
 * @param {string} message - Reply message
 * @param {string} pageAccessToken - Page access token
 * @returns {Object} Reply response
 */
const replyToComment = async (commentId, message, pageAccessToken) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/${commentId}/comments`,
      {
        message: message
      },
      {
        params: {
          access_token: pageAccessToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

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
};

/**
 * Get user's long-lived access token
 * @param {string} shortLivedToken - Short-lived user access token
 * @returns {Object} Long-lived token data
 */
const getLongLivedUserToken = async (shortLivedToken) => {
  try {
    const response = await axios.get(
      "https://graph.facebook.com/v23.0/oauth/access_token",
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          fb_exchange_token: shortLivedToken,
        },
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error getting long-lived token:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Set up webhook subscription for a page
 * @param {string} pageId - Page ID
 * @param {string} pageAccessToken - Page access token
 * @param {string} callbackUrl - Webhook callback URL
 * @returns {Object} Subscription response
 */
const subscribeToWebhook = async (pageId, pageAccessToken, callbackUrl) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/${pageId}/subscribed_apps`,
      {
        subscribed_fields: "messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads,messaging_payments,messaging_pre_checkouts,messaging_checkout_updates,messaging_account_linking,messaging_referrals"
      },
      {
        params: {
          access_token: pageAccessToken
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error subscribing to webhook:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Helper function to set object value if value exists
 * @param {Object} object - Target object
 * @param {string} key - Property key
 * @param {any} value - Value to set
 */
function setValue(object, key, value) {
  if (value) object[key] = value;
}

module.exports = {
  getLinkedPages,
  getCustomerProfile,
  getPageProfile,
  sendMessageToPerson,
  getPostComments,
  replyToComment,
  getLongLivedUserToken,
  subscribeToWebhook,
  customProfile
};
