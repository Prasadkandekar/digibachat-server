const express = require('express');
const router = express.Router();
const {
  forgotPassword,
  resetPassword,
  verifyResetToken
} = require('../controllers/passwordController');
const {
  validateEmail,
  validatePasswordReset
} = require('../middleware/validation');

// Forgot password route
router.post('/forgot-password', validateEmail, forgotPassword);

// Verify reset token
router.post('/verify-reset-token', verifyResetToken);

// Reset password route
router.post('/reset-password', validatePasswordReset, resetPassword);

module.exports = router;