const bcrypt = require('bcryptjs');
const User = require('../modals/User');
const PasswordResetToken = require('../modals/PasswordResetToken');
const { generateResetToken } = require('../services/tokenService');
const { sendPasswordResetEmail } = require('../services/emailService');

// Forgot password - initiate password reset
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      // For security reasons, don't reveal if email exists or not
      return res.json({ 
        message: 'If your email is registered, you will receive a password reset link' 
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save reset token
    await PasswordResetToken.create(user.id, resetToken, expiresAt);

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken, user.name);

    res.json({ 
      message: 'If your email is registered, you will receive a password reset link' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
};

// Reset password - validate token and update password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Find valid token
    const resetToken = await PasswordResetToken.findValidToken(token);
    if (!resetToken) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user password
    await User.updatePassword(resetToken.user_id, hashedPassword);

    // Mark token as used
    await PasswordResetToken.markAsUsed(resetToken.id);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// Verify reset token
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    // Find valid token
    const resetToken = await PasswordResetToken.findValidToken(token);
    if (!resetToken) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Token is valid', valid: true });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ message: 'Server error during token verification' });
  }
};

module.exports = { forgotPassword, resetPassword, verifyResetToken };