const mongoose = require('mongoose');
const User = require('./models/User');

async function addFacebookPageToUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/facebook_dashboard');
    console.log('Connected to MongoDB');
    
    // Find the test user
    const user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('Test user not found');
      return;
    }
    
    // Add Facebook page data
    const pageData = {
      pageId: '666760583189727',
      pageName: 'Test Store',
      pageAccessToken: 'EAAOEXMrqZACQBO0pMxufZAWlupOF9fIJyxDNzGoJaEpYfjmuUjRhOMAehMEais9KFFKDDKP6nX3OTPnwHYpNuPPE34RayBO5WzdlJ6RZCmMP6SWeFhPpZAyZB8zIOrcLwJP82iHIe0PkCGscQOQG2F4j4ZAvmHGBq8ZChatX3ng5xLDIprcZAVEbKAZCwbXpfUD02ZClmnfOU5',
      picture: 'https://example.com/page.jpg',
      about: 'Test Facebook Page',
      category: 'Shopping & Retail',
      connectedAt: new Date()
    };
    
    await user.addFacebookPage(pageData);
    console.log('Facebook page added to user');
    console.log('Page ID:', pageData.pageId);
    console.log('Page Name:', pageData.pageName);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

addFacebookPageToUser();
