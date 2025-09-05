const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../modals/User');
const { createOTP, verifyOTP } = require('../services/otpService');
const { sendOTPEmail } = require('../services/emailService');
const BlacklistedToken = require('../modals/BlackListedTokens');

// Register user
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this email' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword
    });

    // Generate and send OTP
    const otp = await createOTP(user.id);
    await sendOTPEmail(email, otp, name);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification code.',
      userId: user.id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration' 
    });
  }
};

// Verify OTP
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (user.verified) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is already verified' 
      });
    }

    // Verify OTP
    const isValid = await verifyOTP(user.id, otp);
    if (!isValid) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired OTP' 
      });
    }

    // Mark user as verified
    await User.verify(user.id);

    res.json({ 
      success: true,
      message: 'Email verified successfully' 
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during verification' 
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check if user is verified
    if (!user.verified) {
      return res.status(400).json({ 
        success: false,
        message: 'Please verify your email first' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token - For PostgreSQL, use user.id (not user._id)
    const token = jwt.sign(
      { 
        id: user.id, // PostgreSQL uses 'id' field, not '_id'
        email: user.email 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRE || '24h'
      }
    );

    console.log('Generated token for user ID:', user.id);
    console.log('Token preview:', token.substring(0, 20) + '...');

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id, 
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
};

// Login user
// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Find user
//     const user = await User.findByEmail(email);
//     if (!user) {
//       return res.status(400).json({ 
//         success: false,
//         message: 'Invalid credentials' 
//       });
//     }

//     // Check if user is verified
//     if (!user.verified) {
//       return res.status(400).json({ 
//         success: false,
//         message: 'Please verify your email first' 
//       });
//     }

//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ 
//         success: false,
//         message: 'Invalid credentials' 
//       });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       { id: user.id },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE }
//     );

//     res.json({
//       success: true,
//       message: 'Login successful',
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email
//       }
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error during login' 
//     });
//   }
// };

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (user.verified) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is already verified' 
      });
    }

    // Generate and send new OTP
    const otp = await createOTP(user.id);
    await sendOTPEmail(email, otp, user.name);

    res.json({ 
      success: true,
      message: 'New OTP sent successfully' 
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while resending OTP' 
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const token = req.token; // Retrieved from auth middleware
    
    // Decode token to get expiration time
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);
    
    // Add token to blacklist
    await BlacklistedToken.add(token, expiresAt);
    
    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during logout' 
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    // User is attached to req by auth middleware
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user data'
    });
  }
};

module.exports = { register, verifyEmail, login, resendOTP, logout, getCurrentUser };