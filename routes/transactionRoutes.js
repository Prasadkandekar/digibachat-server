const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authmiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Make a contribution
router.post('/groups/:groupId/contribute', transactionController.makeContribution);

// Get transaction history for a group
router.get('/groups/:groupId/transactions', transactionController.getGroupTransactions);

// Get user's transaction history
router.get('/user/transactions', transactionController.getUserTransactions);

// Get upcoming contributions
router.get('/user/upcoming-contributions', transactionController.getUpcomingContributions);

// Get group savings summary - total contributions by each member
router.get('/groups/:groupId/savings-summary', transactionController.getGroupSavingsSummary);

// Get user total savings across all groups
router.get('/user/total-savings', transactionController.getUserTotalSavings);

// Get user contributions across all groups
router.get('/user/contributions', transactionController.getUserContributions);

module.exports = router;
