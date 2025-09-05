const jwt = require('jsonwebtoken');
const User = require('../modals/User');
const BlacklistedToken = require('../modals/BlackListedTokens');

const auth = async (req, res, next) => {
  try {
    console.log('=== AUTH MIDDLEWARE DEBUG ===');
    console.log('All headers:', req.headers);
    
    // Use lowercase 'authorization' since Node.js normalizes headers
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader);
    
    if (!authHeader) {
      console.log('No authorization header found');
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    // Check if it starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      console.log('Invalid authorization format:', authHeader);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format. Use: Bearer <token>' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('Extracted token:', token.substring(0, 20) + '...');
    
    // Check if token is blacklisted
    const isBlacklisted = await BlacklistedToken.isBlacklisted(token);
    if (isBlacklisted) {
      console.log('Token is blacklisted');
      return res.status(401).json({ 
        success: false,
        message: 'Token has been invalidated.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Find user
    // const user = await User.findById(decoded.id);
    // if (!user) {
    //   console.log('User not found for ID:', decoded.id);
    //   return res.status(401).json({ 
    //     success: false,
    //     message: 'Token is not valid.' 
    //   });
    // }

    const user = await User.findByEmail(decoded.email);
    if (!user) {
       console.log('User not found for ID:', decoded.id);
       return res.status(401).json({ 
       success: false,
       message: 'Token is not valid.' 
      });
        }


    req.user = user;
    req.token = token;
    console.log('Authentication successful for user:', user.email);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired. Please login again.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token.' 
      });
    }

    res.status(401).json({ 
      success: false,
      message: 'Token is not valid.' 
    });
  }
};

module.exports = auth;  