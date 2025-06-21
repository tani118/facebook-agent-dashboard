const mongoose = require('mongoose');
const User = require('./models/User');

async function debugLogin() {
  try {
    await mongoose.connect('mongodb://localhost:27017/facebook-helpdesk-dashboard');
    console.log('Connected to MongoDB');
    
    // Find the user 
    const user = await User.findByEmail('test@example.com').select('+password');
    if (!user) {
      console.log('User not found');
    } else {
      console.log('User found:', user.email);
      console.log('Password exists:', !!user.password);
      console.log('Password length:', user.password ? user.password.length : 0);
      
      // Test password comparison
      const isValid = await user.comparePassword('Test123!');
      console.log('Password valid:', isValid);
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

debugLogin();
