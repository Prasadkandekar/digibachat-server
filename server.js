const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const OTP = require('./modals/OTP');
const passwordRoutes = require('./routes/password');
const PasswordResetToken = require('./modals/PasswordResetToken');
const BlacklistedToken = require('./modals/BlackListedTokens');
const groupRoutes = require('./routes/groupRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
// app.use(cors({
//   origin: "*",
// }));
// Allow specific origins with credentials
app.use(cors({
  origin: ["https://digibachat.vercel.app"], // whitelist array works better
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// explicitly handle preflight
app.options("*", cors());



// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests
  standardHeaders: true, // add RateLimit-* headers
  legacyHeaders: false,  // disable X-RateLimit-* headers
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "Too many requests, please try again later.",
      retryAfter: Math.ceil(options.windowMs / 1000) // in seconds
    });
  }
});
app.use(limiter);

// Allow credentials in CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/password',passwordRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/transactions', transactionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Schedule daily cleanup of expired OTPs, reset tokens, and blacklisted tokens
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily cleanup of expired tokens');
  try {
    await OTP.cleanupExpired();
    await PasswordResetToken.cleanupExpired();
    await BlacklistedToken.cleanupExpired();
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});