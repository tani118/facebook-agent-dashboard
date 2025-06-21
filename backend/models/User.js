const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  facebookPages: [{
    pageId: String,
    pageName: String,
    pageAccessToken: String,
    picture: String,
    about: String,
    category: String,
    fanCount: Number,
    website: String,
    connectedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to add Facebook page
userSchema.methods.addFacebookPage = function(pageData) {
  // Check if page already exists
  const existingPageIndex = this.facebookPages.findIndex(page => page.pageId === pageData.pageId);
  
  if (existingPageIndex !== -1) {
    // Update existing page
    this.facebookPages[existingPageIndex] = {
      ...this.facebookPages[existingPageIndex].toObject(),
      ...pageData,
      connectedAt: new Date()
    };
  } else {
    // Add new page
    this.facebookPages.push({
      ...pageData,
      connectedAt: new Date()
    });
  }
  
  return this.save();
};

// Instance method to remove Facebook page
userSchema.methods.removeFacebookPage = function(pageId) {
  this.facebookPages = this.facebookPages.filter(page => page.pageId !== pageId);
  return this.save();
};

// Instance method to get Facebook page
userSchema.methods.getFacebookPage = function(pageId) {
  return this.facebookPages.find(page => page.pageId === pageId);
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
