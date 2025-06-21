const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/facebook-helpdesk-dashboard');
    console.log('Connected to MongoDB');
    
    // Check if test user exists
    let user = await User.findOne({ email: 'test@example.com' });
    
    if (!user) {
      console.log('Creating test user...');
      const hashedPassword = await bcrypt.hash('test123', 10);
      user = new User({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User'
      });
      await user.save();
      console.log('Test user created');
    } else {
      console.log('Test user already exists');
    }
    
    console.log('User ID:', user._id);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

createTestUser();
