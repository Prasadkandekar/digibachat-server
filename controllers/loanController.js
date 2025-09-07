const Loan = require('../modals/Loan');
const Transaction = require('../modals/Transaction');
const GroupMember = require('../modals/GroupMember');
const Group = require('../modals/Group');
const db = require('../config/neondb');

// Generate a unique transaction reference
const generateTransactionReference = () => {
  return 'LOAN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
};

const loanController = {
  // Create a loan request
  createLoanRequest: async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;
      const { amount, purpose } = req.body;

      // Validate input
      if (!amount || !purpose) {
        return res.status(400).json({
          success: false,
          message: 'Loan amount and purpose are required'
        });
      }

      // Check if user is a member of the group
      const isMember = await GroupMember.isApprovedMember(groupId, userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this group'
        });
      }

      // Create loan request
      const loanRequest = await Loan.createRequest({
        group_id: groupId,
        user_id: userId,
        amount,
        purpose
      });

      res.status(201).json({
        success: true,
        message: 'Loan request created successfully',
        data: loanRequest
      });
    } catch (error) {
      console.error('Create loan request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create loan request',
        error: error.message
      });
    }
  },

  // Get all loan requests for a group
  getGroupLoanRequests: async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;
      const { status } = req.query;

      // Check if user is a member of the group
      const isMember = await GroupMember.isApprovedMember(groupId, userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this group'
        });
      }

      // Get loan requests
      const loans = await Loan.findByGroupId(groupId, status);

      res.json({
        success: true,
        data: {
          loans
        }
      });
    } catch (error) {
      console.error('Get group loan requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch loan requests',
        error: error.message
      });
    }
  },

  // Get user's loan requests
  getUserLoanRequests: async (req, res) => {
    try {
      const userId = req.user.id;
      const { status } = req.query;

      // Get user's loan requests
      const loans = await Loan.findByUserId(userId, status);

      res.json({
        success: true,
        data: loans
      });
    } catch (error) {
      console.error('Get user loan requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch loan requests',
        error: error.message
      });
    }
  },

  // Approve a loan request
  approveLoanRequest: async (req, res) => {
    try {
      const { groupId, loanId } = req.params;
      const approverId = req.user.id;
      const { dueDate, interestRate, paymentMethod } = req.body;

      // Validate input
      if (!dueDate || !interestRate || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Due date, interest rate, and payment method are required'
        });
      }

      // Check if user is the group leader
      const isLeader = await GroupMember.isLeader(groupId, approverId);
      if (!isLeader) {
        return res.status(403).json({
          success: false,
          message: 'Only group leaders can approve loan requests'
        });
      }

      // Check if the group already has an approved loan this month
      const hasApprovedLoan = await Loan.hasApprovedLoanInCurrentMonth(groupId);
      if (hasApprovedLoan) {
        return res.status(400).json({
          success: false,
          message: 'This group already has an approved loan this month'
        });
      }

      // Get loan request details
      const loanRequest = await Loan.findById(loanId);
      if (!loanRequest || loanRequest.group_id != groupId) {
        return res.status(404).json({
          success: false,
          message: 'Loan request not found'
        });
      }

      if (loanRequest.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Loan request has already been ${loanRequest.status}`
        });
      }

      // Approve the loan request
      const approvedLoan = await Loan.approveLoan(
        loanId,
        approverId,
        new Date(dueDate),
        interestRate
      );

      // Create a transaction record for the loan
      const transactionData = {
        group_id: groupId,
        user_id: loanRequest.user_id,
        amount: loanRequest.amount,
        type: 'loan',
        payment_method: paymentMethod,
        transaction_reference: generateTransactionReference(),
        description: `Loan approved for ${loanRequest.purpose}`,
        due_date: dueDate ? new Date(dueDate) : null
      };
      
      const transaction = await Transaction.create(transactionData);

      // Update transaction status to completed
      await Transaction.updateStatus(transaction.id, 'completed');

      res.json({
        success: true,
        message: 'Loan request approved successfully',
        data: {
          loan: approvedLoan,
          transaction: {
            id: transaction.id,
            amount: transaction.amount,
            reference: transaction.transaction_reference
          }
        }
      });
    } catch (error) {
      console.error('Approve loan request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve loan request',
        error: error.message
      });
    }
  },

  // Reject a loan request
  rejectLoanRequest: async (req, res) => {
    try {
      const { groupId, loanId } = req.params;
      const approverId = req.user.id;

      // Check if user is the group leader
      const isLeader = await GroupMember.isLeader(groupId, approverId);
      if (!isLeader) {
        return res.status(403).json({
          success: false,
          message: 'Only group leaders can reject loan requests'
        });
      }

      // Get loan request details
      const loanRequest = await Loan.findById(loanId);
      if (!loanRequest || loanRequest.group_id != groupId) {
        return res.status(404).json({
          success: false,
          message: 'Loan request not found'
        });
      }

      if (loanRequest.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Loan request has already been ${loanRequest.status}`
        });
      }

      // Reject the loan request
      const rejectedLoan = await Loan.rejectLoan(loanId, approverId);

      res.json({
        success: true,
        message: 'Loan request rejected successfully',
        data: {
          loan: rejectedLoan
        }
      });
    } catch (error) {
      console.error('Reject loan request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject loan request',
        error: error.message
      });
    }
  },

  // Make a loan repayment
  makeLoanRepayment: async (req, res) => {
    try {
      const { loanId } = req.params;
      const userId = req.user.id;
      const { amount, paymentMethod } = req.body;

      // Validate input
      if (!amount || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Repayment amount and payment method are required'
        });
      }

      // Get loan details
      const loan = await Loan.findById(loanId);
      if (!loan) {
        return res.status(404).json({
          success: false,
          message: 'Loan not found'
        });
      }

      // Check if user is the loan borrower
      if (loan.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only repay your own loans'
        });
      }

      if (loan.status === 'rejected' || loan.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: `Cannot repay a ${loan.status} loan`
        });
      }

      // Create a transaction record for the repayment
      const transaction = await Transaction.create({
        group_id: loan.group_id,
        user_id: userId,
        amount,
        type: 'repayment',
        payment_method: paymentMethod,
        transaction_reference: generateTransactionReference(),
        description: `Repayment for loan #${loanId}`
      });

      // Update transaction status to completed
      await Transaction.updateStatus(transaction.id, 'completed');

      // Record the repayment in the loan
      const updatedLoan = await Loan.recordRepayment(loanId, amount);

      res.json({
        success: true,
        message: 'Loan repayment processed successfully',
        data: {
          loan: updatedLoan,
          transaction: {
            id: transaction.id,
            amount: transaction.amount,
            reference: transaction.transaction_reference
          }
        }
      });
    } catch (error) {
      console.error('Loan repayment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process loan repayment',
        error: error.message
      });
    }
  },

  // Apply penalty to an overdue loan
  applyLoanPenalty: async (req, res) => {
    try {
      const { groupId, loanId } = req.params;
      const userId = req.user.id;
      const { penaltyRate } = req.body;

      // Validate input
      if (!penaltyRate) {
        return res.status(400).json({
          success: false,
          message: 'Penalty rate is required'
        });
      }

      // Check if user is the group leader
      const isLeader = await GroupMember.isLeader(groupId, userId);
      if (!isLeader) {
        return res.status(403).json({
          success: false,
          message: 'Only group leaders can apply penalties'
        });
      }

      // Get loan details
      const loan = await Loan.findById(loanId);
      if (!loan || loan.group_id != groupId) {
        return res.status(404).json({
          success: false,
          message: 'Loan not found'
        });
      }

      // Check if loan is overdue
      const now = new Date();
      const dueDate = new Date(loan.due_date);
      if (now <= dueDate) {
        return res.status(400).json({
          success: false,
          message: 'Cannot apply penalty to a loan that is not overdue'
        });
      }

      if (loan.status === 'paid' || loan.status === 'rejected') {
        return res.status(400).json({
          success: false,
          message: `Cannot apply penalty to a ${loan.status} loan`
        });
      }

      // Apply penalty
      const updatedLoan = await Loan.applyPenalty(loanId, penaltyRate);

      res.json({
        success: true,
        message: 'Penalty applied successfully',
        data: {
          loan: updatedLoan
        }
      });
    } catch (error) {
      console.error('Apply loan penalty error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply penalty',
        error: error.message
      });
    }
  },

  // Get overdue loans
  getOverdueLoans: async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      // Check if user is the group leader
      const isLeader = await GroupMember.isLeader(groupId, userId);
      if (!isLeader) {
        return res.status(403).json({
          success: false,
          message: 'Only group leaders can view overdue loans'
        });
      }

      // Get all overdue loans for the group
      const overdueLoans = await Loan.findOverdueLoans();
      const groupOverdueLoans = overdueLoans.filter(loan => loan.group_id == groupId);

      res.json({
        success: true,
        data: {
          overdueLoans: groupOverdueLoans
        }
      });
    } catch (error) {
      console.error('Get overdue loans error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch overdue loans',
        error: error.message
      });
    }
  }
};

module.exports = loanController;