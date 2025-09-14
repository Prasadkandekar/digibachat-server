# DigiBachat - Digital Group Savings Application (Backend)

## Overview
DiGiBachat is a fintech platform that empowers communities to save together and borrow together in a secure, transparent, and mobile-first ecosystem. With UPI integration, role-based controls, and detailed financial reporting, it brings the power of traditional group savings and lending into a modern digital experience.

## Features
- 🔐 JWT-based authentication
- 📱 OTP verification system
- 💾 PostgreSQL database integration
- 💰 UPI payment processing
- 👥 Group management
- 💸 Loan processing
- 📊 Transaction tracking
- 🔔 Email notifications

## Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (with Neon DB)
- **ORM**: Sequelize
- **Authentication**: JWT
- **Email Service**: NodeMailer
- **Payment Integration**: UPI
- **Validation**: Express Validator

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL
- npm (v6 or higher)

### Installation
1. Clone the repository:
```bash
git clone https://github.com/Prasadkandekar/digibachat-server.git
cd digibachat-server
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=your_db_name

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# UPI Configuration
UPI_MERCHANT_ID=your_merchant_id
UPI_API_KEY=your_api_key
```

4. Run database migrations:
```bash
npm run migrate
```

5. Start the server:
```bash
npm run dev
```

## API Documentation

### Authentication Endpoints
- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- POST /api/auth/verify-otp - OTP verification
- POST /api/auth/resend-otp - Resend OTP
- POST /api/auth/forgot-password - Password reset request
- POST /api/auth/reset-password - Reset password

### Group Endpoints
- POST /api/groups - Create new group
- GET /api/groups - Get user's groups
- GET /api/groups/:id - Get group details
- PUT /api/groups/:id - Update group
- POST /api/groups/:id/join - Join group
- POST /api/groups/:id/leave - Leave group

### Transaction Endpoints
- POST /api/transactions - Create transaction
- GET /api/transactions - Get transactions
- GET /api/transactions/:id - Get transaction details
- POST /api/transactions/:id/verify-upi - Verify UPI payment

### Loan Endpoints
- POST /api/loans - Create loan request
- GET /api/loans - Get loans
- PUT /api/loans/:id/approve - Approve loan
- PUT /api/loans/:id/reject - Reject loan
- POST /api/loans/:id/repay - Repay loan

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Groups Table
```sql
CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  group_code VARCHAR(10) UNIQUE NOT NULL,
  leader_id INTEGER REFERENCES users(id),
  savings_frequency VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment

### Server Deployment (on Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure environment variables
4. Set build command: `npm install`
5. Set start command: `npm start`

### Database Deployment (on Neon)
1. Create a new project on Neon
2. Create a new database
3. Configure connection parameters
4. Run migrations on production database

## Security Measures
- Password hashing using bcrypt
- JWT token validation
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection
- CORS configuration

## Error Handling
- Custom error middleware
- Standardized error responses
- Validation error handling
- Database error handling
- Async error handling

## Monitoring
- Error logging
- Performance monitoring
- Database query monitoring
- API request logging
- Authentication logging

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## Testing
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Maintenance
- Regular dependency updates
- Security patches
- Database backups
- Performance optimization
- Code refactoring

## Support
For support, email us at digibachat@gmail.com or reach out through our support channels.

## License
This project is licensed under the MIT License - see the LICENSE file for details.
