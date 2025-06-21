const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  console.log('=== VERIFY TOKEN MIDDLEWARE ===');
  console.log('Headers:', req.headers);
  console.log('Authorization header:', req.headers.authorization);
  
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token found in Bearer header:', token?.substring(0, 20) + '...');
    }
    // Check for token in cookies (if using cookie-based auth)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Token found in cookies');
    }

    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    console.log('Verifying token with JWT_SECRET');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', decoded);
    
    // Get user from token
    const user = await User.findById(decoded.userId).select('-password');
    console.log('User found:', user?._id);
    
    if (!user) {
      console.log('User not found for token');
      return res.status(401).json({
        success: false,
        message: 'Token is not valid - user not found.'
      });
    }

    req.user = user;
    console.log('Token verification successful, proceeding to next middleware');
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

module.exports = {
  generateToken,
  verifyToken
};
