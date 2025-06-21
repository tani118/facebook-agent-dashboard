const mongoose = require('mongoose');
const User = require('./models/User');

async function checkPages() {
  try {
    await mongoose.connect('mongodb://localhost:27017/facebook_dashboard');
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({});
    console.log('User found:', !!user);
    
    if (user && user.facebookPages) {
      console.log('Facebook pages:', user.facebookPages.length);
      user.facebookPages.forEach(page => {
        console.log('Page ID:', page.pageId);
        console.log('Page Name:', page.pageName);
        console.log('Has Access Token:', !!page.pageAccessToken);
        console.log('---');
      });
    } else {
      console.log('No Facebook pages found');
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkPages();
