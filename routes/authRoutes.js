const express = require('express');
const router = express.Router();
const {
  register,
  verifyEmail,
  login,
  resendOTP,
  logout,
  logoutAll
} = require('../controllers/authController');
const {
  validateRegistration,
  validateLogin,
  validateOTP
} = require('../middleware/validation');
const auth = require('../middleware/authmiddleware'); 
// Register route
router.post('/register', validateRegistration, register);

// Verify email with OTP
router.post('/verify-email', validateOTP, verifyEmail);

// Login route
router.post('/login', validateLogin, login);

// Resend OTP
router.post('/resend-otp', resendOTP);

// Logout route (requires authentication)
router.post('/logout', auth, logout);

module.exports = router;