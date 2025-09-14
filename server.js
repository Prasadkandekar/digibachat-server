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
const loanRoutes = require('./routes/loanRoutes');

const app = express();

// ---------------- Security ----------------
app.use(helmet());

// ---------------- CORS ----------------
const allowedOrigins = [
  "https://digibachat.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
 
];

app.use(cors({
  origin: function (origin, callback) {
    // allow REST clients (Postman) without origin OR whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // allow cookies / auth headers
}));

// Handle preflight requests globally
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  return res.sendStatus(200);
});

// ---------------- Rate Limiting ----------------
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: (req, res, next, options) => {
//     res.status(options.statusCode).json({
//       success: false,
//       message: "Too many requests, please try again later.",
//       retryAfter: Math.ceil(options.windowMs / 1000) // in seconds
//     });
//   }
// });
// app.use(limiter);

// ---------------- Parsers ----------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------- Routes ----------------
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/loans', loanRoutes);

// ---------------- Health Check ----------------
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running!' });
});

// ---------------- 404 Handler ----------------
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ---------------- Error Handler ----------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// ---------------- CRON Jobs ----------------
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

// ---------------- Start Server ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
