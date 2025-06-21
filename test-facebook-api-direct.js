#!/usr/bin/env node

const axios = require('axios');

async function testFacebookToken() {
  // Your Facebook page access token from the error
  const pageAccessToken = 'EAAOEXMrqZACQBO0pMxufZAWlupOF9fIJyxDNzGoJaEpYfjmuUjRhOMAehMEais9KFFKDDKP6nX3OTPnwHYpNuPPE34RayBO5WzdlJ6RZCmMP6SWeFhPpZAyZB8zIOrcLwJP82iHIe0PkCGscQOQG2F4j4ZAvmHGBq8ZChatX3ng5xLDIprcZAVEbKAZCwbXpfUD02ZClmnfOU5';
  const pageId = '666760583189727';

  console.log('🔍 Testing Facebook API directly...\n');

  try {
    console.log('📄 Testing posts endpoint...');
    const postsResponse = await axios.get(`https://graph.facebook.com/v23.0/${pageId}/posts`, {
      params: {
        access_token: pageAccessToken,
        limit: 5,
        fields: 'id,message,created_time,comments.limit(3){id,message,created_time,from}'
      }
    });

    console.log('✅ Facebook API working!');
    console.log(`📊 Found ${postsResponse.data.data.length} posts`);

    if (postsResponse.data.data.length > 0) {
      console.log('\n📝 Recent posts with comments:');
      postsResponse.data.data.forEach((post, index) => {
        console.log(`\n${index + 1}. Post: "${post.message || 'No message'}" (${new Date(post.created_time).toLocaleDateString()})`);
        
        if (post.comments && post.comments.data.length > 0) {
          console.log(`   💬 ${post.comments.data.length} recent comments:`);
          post.comments.data.forEach((comment, cIndex) => {
            console.log(`      ${cIndex + 1}. ${comment.from.name}: "${comment.message}"`);
          });
        } else {
          console.log('   💬 No recent comments');
        }
      });
    } else {
      console.log('📭 No posts found. This could mean:');
      console.log('   1. Page has no published posts');
      console.log('   2. Token lacks permission to read posts');
      console.log('   3. Posts are restricted/private');
    }

  } catch (error) {
    console.log('❌ Facebook API Error:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.error) {
        const fbError = error.response.data.error;
        console.log('\n💡 Facebook Error Details:');
        console.log(`   Code: ${fbError.code}`);
        console.log(`   Type: ${fbError.type}`);
        console.log(`   Message: ${fbError.message}`);
        
        if (fbError.code === 190) {
          console.log('\n🔧 Token Issue - Try:');
          console.log('   1. Generate a new page access token');
          console.log('   2. Ensure token has pages_read_engagement permission');
          console.log('   3. Check if token is expired');
        } else if (fbError.code === 10) {
          console.log('\n🔧 Permission Issue - Try:');
          console.log('   1. Grant pages_read_engagement permission');
          console.log('   2. Make sure you are admin of the page');
        }
      }
    } else {
      console.log('Network error:', error.message);
    }
  }
}

testFacebookToken();
