const jwt = require('jsonwebtoken');
const User = require('../modals/User');
const BlacklistedToken = require('../modals/BlackListedTokens');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

     // Check if token is blacklisted
    const isBlacklisted = await BlacklistedToken.isBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been invalidated.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid.' });
  }
};

module.exports = auth;