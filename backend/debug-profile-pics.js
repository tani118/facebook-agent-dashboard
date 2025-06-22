#!/usr/bin/env node

/**
 * Debug Profile Pictures - Test script to check profile picture fetching
 * Run with: node debug-profile-pics.js
 */

const FacebookMessageFetcher = require('./api/fetch-messages');

async function testProfilePictures() {
  console.log('🔍 Testing Profile Picture Fetching...\n');

  // You'll need to replace these with actual values for testing
  const PAGE_ACCESS_TOKEN = 'YOUR_PAGE_ACCESS_TOKEN_HERE';
  const TEST_USER_ID = 'TEST_USER_ID_HERE';
  const PAGE_ID = 'YOUR_PAGE_ID_HERE';

  if (PAGE_ACCESS_TOKEN === 'YOUR_PAGE_ACCESS_TOKEN_HERE') {
    console.log('❌ Please update the PAGE_ACCESS_TOKEN, TEST_USER_ID, and PAGE_ID in this script');
    console.log('   You can find these values in your database or Facebook developer console');
    return;
  }

  try {
    const fetcher = new FacebookMessageFetcher(PAGE_ACCESS_TOKEN, PAGE_ID);

    console.log('1. Testing user profile fetch...');
    const profileResult = await fetcher.fetchUserProfile(TEST_USER_ID);
    
    if (profileResult.success) {
      console.log('✅ Profile fetch successful:');
      console.log('   Name:', profileResult.data.name);
      console.log('   Profile Pic:', profileResult.data.profile_pic);
      console.log('   Picture Object:', profileResult.data.picture);
      console.log('   Full Data:', JSON.stringify(profileResult.data, null, 2));
    } else {
      console.log('❌ Profile fetch failed:', profileResult.error);
    }

    console.log('\n2. Testing conversations fetch...');
    const conversationsResult = await fetcher.fetchConversations(PAGE_ID, 5);
    
    if (conversationsResult.success) {
      console.log('✅ Conversations fetch successful');
      conversationsResult.data.data.forEach((conv, index) => {
        console.log(`\n   Conversation ${index + 1}:`);
        console.log('   ID:', conv.id);
        console.log('   Participants:', conv.participants?.data?.map(p => ({
          id: p.id,
          name: p.name,
          profile_pic: p.profile_pic,
          picture: p.picture
        })));
      });
    } else {
      console.log('❌ Conversations fetch failed:', conversationsResult.error);
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

if (require.main === module) {
  testProfilePictures();
}

module.exports = { testProfilePictures };
