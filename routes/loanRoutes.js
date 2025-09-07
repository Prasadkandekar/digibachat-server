const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const authMiddleware = require('../middleware/authmiddleware');
const groupAuth = require('../middleware/groupAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create a loan request
router.post('/groups/:groupId/loans', loanController.createLoanRequest);

// Get all loan requests for a group
router.get('/groups/:groupId/loans', loanController.getGroupLoanRequests);

// Get user's loan requests
router.get('/user/loans', loanController.getUserLoanRequests);

// Approve a loan request (group leader only)
router.put('/groups/:groupId/loans/:loanId/approve', groupAuth.isGroupLeader, loanController.approveLoanRequest);

// Reject a loan request (group leader only)
router.put('/groups/:groupId/loans/:loanId/reject', groupAuth.isGroupLeader, loanController.rejectLoanRequest);

// Make a loan repayment
router.post('/loans/:loanId/repay', loanController.makeLoanRepayment);

// Apply penalty to an overdue loan (group leader only)
router.put('/groups/:groupId/loans/:loanId/penalty', groupAuth.isGroupLeader, loanController.applyLoanPenalty);

// Get overdue loans (group leader only)
router.get('/groups/:groupId/loans/overdue', groupAuth.isGroupLeader, loanController.getOverdueLoans);

module.exports = router;