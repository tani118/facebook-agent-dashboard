#!/usr/bin/env node

const axios = require('axios');

async function testFacebookTokens() {
  console.log('🔍 Testing Facebook API connectivity...\n');

  // Test page ID from your error
  const pageId = '666760583189727';
  
  // You need to replace this with a real page access token
  const testToken = 'YOUR_PAGE_ACCESS_TOKEN_HERE';
  
  if (testToken === 'YOUR_PAGE_ACCESS_TOKEN_HERE') {
    console.log('❌ Please update the testToken variable with a real Facebook page access token');
    console.log('💡 You can get this from:');
    console.log('   1. Facebook Developers Console');
    console.log('   2. Graph API Explorer');
    console.log('   3. Your app\'s OAuth flow\n');
    return;
  }

  try {
    console.log('📄 Testing posts endpoint...');
    const postsResponse = await axios.get(`https://graph.facebook.com/v23.0/${pageId}/posts`, {
      params: {
        access_token: testToken,
        limit: 5,
        fields: 'id,message,created_time,comments_count'
      }
    });

    console.log('✅ Posts API working!');
    console.log(`📊 Found ${postsResponse.data.data.length} posts`);

    if (postsResponse.data.data.length > 0) {
      const firstPost = postsResponse.data.data[0];
      console.log(`📝 Latest post: "${firstPost.message || 'No message'}" (${firstPost.comments_count || 0} comments)`);

      // Test comments for the first post
      if (firstPost.comments_count > 0) {
        console.log('\n💬 Testing comments endpoint...');
        const commentsResponse = await axios.get(`https://graph.facebook.com/v23.0/${firstPost.id}/comments`, {
          params: {
            access_token: testToken,
            limit: 5,
            fields: 'id,message,created_time,from'
          }
        });

        console.log('✅ Comments API working!');
        console.log(`💬 Found ${commentsResponse.data.data.length} comments on latest post`);
        
        commentsResponse.data.data.forEach((comment, index) => {
          console.log(`   ${index + 1}. ${comment.from.name}: "${comment.message || 'No message'}"`);
        });
      }
    }

  } catch (error) {
    console.log('❌ Facebook API Error:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data?.error || error.message);
    
    if (error.response?.data?.error?.code === 190) {
      console.log('\n💡 Token Error - Possible solutions:');
      console.log('   1. Token expired - Get a new token');
      console.log('   2. Invalid token - Check token format');
      console.log('   3. Missing permissions - Grant required permissions');
    }
  }
}

testFacebookTokens();
