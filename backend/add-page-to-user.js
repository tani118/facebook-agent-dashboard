const mongoose = require('mongoose');
const User = require('./models/User');

async function addPageToUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/facebook-helpdesk');
    console.log('Connected to MongoDB');
    
    // Find the user who has Facebook pages
    const userWithPages = await User.findOne({ 'facebookPages.0': { $exists: true } });
    console.log('User with pages found:', !!userWithPages);
    
    if (userWithPages) {
      console.log('Pages on original user:', userWithPages.facebookPages.length);
      const page = userWithPages.facebookPages[0];
      console.log('Page to copy:', page.pageId, page.pageName);
      
      // Find the current test user
      const testUser = await User.findOne({ email: 'test@example.com' });
      console.log('Test user found:', !!testUser);
      
      if (testUser) {
        // Copy the page to test user
        testUser.facebookPages = testUser.facebookPages || [];
        testUser.facebookPages.push({
          pageId: page.pageId,
          pageName: page.pageName,
          pageAccessToken: page.pageAccessToken,
          picture: page.picture,
          about: page.about,
          category: page.category,
          fanCount: page.fanCount,
          website: page.website,
          connectedAt: new Date()
        });
        
        await testUser.save();
        console.log('Page copied to test user successfully');
      }
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

addPageToUser();
