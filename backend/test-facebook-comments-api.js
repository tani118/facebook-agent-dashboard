const axios = require('axios');

async function testFacebookCommentsAPI() {
  const pageAccessToken = "EAAOEXMrqZACQBO0pMxufZAWlupOF9fIJyxDNzGoJaEpYfjmuUjRhOMAehMEais9KFFKDDKP6nX3OTPnwHYpNuPPE34RayBO5WzdlJ6RZCmMP6SWeFhPpZAyZB8zIOrcLwJP82iHIe0PkCGscQOQG2F4j4ZAvmHGBq8ZChatX3ng5xLDIprcZAVEbKAZCwbXpfUD02ZClmnfOU5";
  const postId = "666760583189727_122107354688907429"; // The post with comments
  
  console.log('Testing Facebook Comments API directly...');
  
  try {
    // Test 1: Get comments without replies
    console.log('\n=== TEST 1: Comments without replies ===');
    const response1 = await axios.get(`https://graph.facebook.com/v23.0/${postId}/comments`, {
      params: {
        access_token: pageAccessToken,
        fields: 'id,message,created_time,from,comment_count',
        limit: 10
      }
    });
    
    console.log('Comments found:', response1.data.data.length);
    response1.data.data.forEach(comment => {
      console.log(`- ${comment.from.name}: "${comment.message}" (${comment.comment_count} replies)`);
    });
    
    // Test 2: Get comments WITH replies
    console.log('\n=== TEST 2: Comments with replies ===');
    const response2 = await axios.get(`https://graph.facebook.com/v23.0/${postId}/comments`, {
      params: {
        access_token: pageAccessToken,
        fields: 'id,message,created_time,from,comment_count,comments.limit(10){id,message,created_time,from}',
        limit: 10
      }
    });
    
    console.log('Comments with replies found:', response2.data.data.length);
    response2.data.data.forEach(comment => {
      console.log(`- ${comment.from.name}: "${comment.message}" (${comment.comment_count} replies)`);
      if (comment.comments && comment.comments.data) {
        comment.comments.data.forEach(reply => {
          console.log(`  ↳ ${reply.from.name}: "${reply.message}"`);
        });
      }
    });
    
    // Test 3: Get a specific comment with high reply count
    const commentWithReplies = response1.data.data.find(c => c.comment_count > 0);
    if (commentWithReplies) {
      console.log(`\n=== TEST 3: Specific comment with ${commentWithReplies.comment_count} replies ===`);
      const response3 = await axios.get(`https://graph.facebook.com/v23.0/${commentWithReplies.id}/comments`, {
        params: {
          access_token: pageAccessToken,
          fields: 'id,message,created_time,from',
          limit: 10
        }
      });
      
      console.log('Direct replies found:', response3.data.data.length);
      response3.data.data.forEach(reply => {
        console.log(`  ↳ ${reply.from.name}: "${reply.message}"`);
      });
    }
    
  } catch (error) {
    console.error('Error testing Facebook API:', error.response?.data || error.message);
  }
}

testFacebookCommentsAPI();
