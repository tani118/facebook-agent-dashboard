const mongoose = require('mongoose');
const User = require('./models/User');

async function createFreshTestUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/facebook_dashboard');
    console.log('Connected to MongoDB');
    
    // Delete existing test user
    await User.deleteOne({ email: 'test@example.com' });
    console.log('Deleted existing test user');
    
    // Create new test user
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'test123'
    });
    
    await user.save();
    console.log('Created fresh test user');
    console.log('User ID:', user._id);
    
    // Test password immediately
    const testUser = await User.findOne({ email: 'test@example.com' }).select('+password');
    const isValid = await testUser.comparePassword('test123');
    console.log('Password validation test:', isValid);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

createFreshTestUser();
