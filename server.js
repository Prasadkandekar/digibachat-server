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

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
// app.use(cors({
//   origin: process.env.NODE_ENV === 'production' 
//     ? 'https://yourdomain.com' 
//     : 'http://localhost:3000',
//   credentials: true
// }));

app.use(cors({
  origin: '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/password',passwordRoutes);

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