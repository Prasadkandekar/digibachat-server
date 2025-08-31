# Backend Authentication Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database (NeonDB recommended)
- npm or yarn package manager

## Environment Variables
Create a `.env` file in the backend directory with the following variables:

```env
# Database Configuration
DATABASE_URL=your_neon_database_connection_string_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=24h

# Email Configuration (Optional for development)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here

# OTP Configuration
OTP_EXPIRY_MINUTES=10

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:5173
```

## Database Setup
1. Run the database schema from `database_schema.sql` in your PostgreSQL database
2. Ensure all tables are created with proper relationships

## Installation
```bash
cd backend
npm install
```

## Running the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Testing Authentication
1. Start the server
2. Run the test script: `node test_auth.js`
3. Check the console for OTP codes during registration
4. Use the OTP to verify email via the verify-email endpoint

## API Endpoints

### Registration
- **POST** `/api/auth/register`
- Body: `{ name, email, phone, password }`
- Response: `{ success: true, message, userId }`

### Email Verification
- **POST** `/api/auth/verify-email`
- Body: `{ email, otp }`
- Response: `{ success: true, message }`

### Login
- **POST** `/api/auth/login`
- Body: `{ email, password }`
- Response: `{ success: true, message, token, user }`

### Resend OTP
- **POST** `/api/auth/resend-otp`
- Body: `{ email }`
- Response: `{ success: true, message }`

### Logout
- **POST** `/api/auth/logout`
- Headers: `Authorization: Bearer <token>`
- Response: `{ success: true, message }`

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL in .env
   - Ensure database is running and accessible

2. **Email Not Sending**
   - Check email configuration in .env
   - For development, OTPs are logged to console
   - Ensure SMTP credentials are correct

3. **JWT Errors**
   - Check JWT_SECRET in .env
   - Ensure JWT_SECRET is a strong, unique string

4. **CORS Issues**
   - Check CORS configuration in server.js
   - Ensure frontend URL is in allowed origins

### Development Tips

1. **OTP Testing**: During development, OTPs are logged to console when email fails
2. **Database**: Use NeonDB for easy PostgreSQL hosting
3. **Environment**: Keep .env file in .gitignore
4. **Logs**: Check server console for detailed error messages

## Security Notes

1. **JWT_SECRET**: Use a strong, random string
2. **Password Hashing**: Passwords are automatically hashed with bcrypt
3. **Rate Limiting**: API endpoints are rate-limited
4. **CORS**: Configure allowed origins properly for production
5. **Helmet**: Security headers are automatically added
