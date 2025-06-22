#!/usr/bin/env node

/**
 * Check User's Connected Facebook Pages
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const User = require('./backend/models/User');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-dashboard');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Check user's connected pages
async function checkUserPages() {
  try {
    console.log('🔍 Looking for user: dummy@dummy.com');
    
    const user = await User.findOne({ email: 'dummy@dummy.com' });
    
    if (!user) {
      console.log('❌ User not found with email: dummy@dummy.com');
      return;
    }
    
    console.log('✅ User found:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || 'Not set'}`);
    console.log(`   Facebook Pages: ${user.facebookPages?.length || 0}`);
    
    if (user.facebookPages && user.facebookPages.length > 0) {
      console.log('\n📄 Connected Facebook Pages:');
      user.facebookPages.forEach((page, index) => {
        console.log(`\n   Page ${index + 1}:`);
        console.log(`     Page ID: ${page.pageId}`);
        console.log(`     Page Name: ${page.pageName || 'Not set'}`);
        console.log(`     Has Access Token: ${!!page.pageAccessToken}`);
        console.log(`     Connected At: ${page.connectedAt || 'Not set'}`);
      });
      
      // Show the first page ID for testing
      const firstPageId = user.facebookPages[0].pageId;
      console.log(`\n🎯 Use this Page ID for testing: ${firstPageId}`);
      console.log(`🆔 Use this User ID for testing: ${user._id}`);
      
      return {
        userId: user._id.toString(),
        pageId: firstPageId,
        userEmail: user.email,
        pageCount: user.facebookPages.length
      };
    } else {
      console.log('❌ No Facebook pages connected to this user');
      return null;
    }
  } catch (error) {
    console.error('❌ Error checking user pages:', error);
    return null;
  }
}

// Check all users with Facebook pages
async function checkAllUsersWithPages() {
  try {
    console.log('\n🔍 Checking all users with Facebook pages...');
    
    const usersWithPages = await User.find({
      'facebookPages.0': { $exists: true }
    });
    
    console.log(`\n📊 Found ${usersWithPages.length} users with Facebook pages:`);
    
    usersWithPages.forEach((user, index) => {
      console.log(`\n   User ${index + 1}:`);
      console.log(`     ID: ${user._id}`);
      console.log(`     Email: ${user.email}`);
      console.log(`     Pages: ${user.facebookPages.length}`);
      
      if (user.facebookPages.length > 0) {
        console.log(`     First Page ID: ${user.facebookPages[0].pageId}`);
      }
    });
    
    return usersWithPages;
  } catch (error) {
    console.error('❌ Error checking all users:', error);
    return [];
  }
}

// Main function
async function main() {
  await connectDB();
  
  console.log('🚀 Checking Facebook page connections...\n');
  
  // Check specific user
  const userPageInfo = await checkUserPages();
  
  // Check all users with pages
  await checkAllUsersWithPages();
  
  if (userPageInfo) {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TESTING CONFIGURATION:');
    console.log('='.repeat(60));
    console.log(`User ID: ${userPageInfo.userId}`);
    console.log(`Page ID: ${userPageInfo.pageId}`);
    console.log(`Email: ${userPageInfo.userEmail}`);
    console.log('\n📝 Update your test scripts with these IDs!');
  }
  
  mongoose.connection.close();
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkUserPages, checkAllUsersWithPages };
