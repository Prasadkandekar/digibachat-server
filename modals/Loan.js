const pool = require('../config/neondb');

class Loan {
  // Create a new loan request
  static async createRequest({ group_id, user_id, amount, purpose }) {
    const query = `
      INSERT INTO loan_requests (group_id, user_id, amount, purpose)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [group_id, user_id, amount, purpose]);
    return result.rows[0];
  }

  // Get loan request by ID
  static async findById(id) {
    const query = `
      SELECT lr.*, u.name as user_name, g.name as group_name
      FROM loan_requests lr
      JOIN users u ON lr.user_id = u.id
      JOIN groups g ON lr.group_id = g.id
      WHERE lr.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Get all loan requests for a group
  static async findByGroupId(groupId, status = null) {
    let query = `
      SELECT lr.*, u.name as user_name, u.email as user_email
      FROM loan_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE lr.group_id = $1
    `;
    
    const params = [groupId];
    if (status) {
      query += ' AND lr.status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY lr.requested_at DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get all loan requests for a user
  static async findByUserId(userId, status = null) {
    let query = `
      SELECT lr.*, g.name as group_name
      FROM loan_requests lr
      JOIN groups g ON lr.group_id = g.id
      WHERE lr.user_id = $1
    `;
    
    const params = [userId];
    if (status) {
      query += ' AND lr.status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY lr.requested_at DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  // Approve a loan request
  static async approveLoan(loanId, approverId, dueDate, interestRate) {
    const query = `
      UPDATE loan_requests
      SET status = 'approved', 
          approved_by = $2, 
          approved_at = CURRENT_TIMESTAMP, 
          due_date = $3,
          interest_rate = $4
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [loanId, approverId, dueDate, interestRate]);
    return result.rows[0];
  }

  // Reject a loan request
  static async rejectLoan(loanId, approverId) {
    const query = `
      UPDATE loan_requests
      SET status = 'rejected', 
          approved_by = $2, 
          approved_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [loanId, approverId]);
    return result.rows[0];
  }

  // Record loan repayment
  static async recordRepayment(loanId, amount) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get current loan details
      const loanQuery = 'SELECT * FROM loan_requests WHERE id = $1';
      const loanResult = await client.query(loanQuery, [loanId]);
      const loan = loanResult.rows[0];
      
      if (!loan) {
        throw new Error('Loan not found');
      }
      
      // Calculate new repaid amount
      const newRepaidAmount = parseFloat(loan.repaid_amount || 0) + parseFloat(amount);
      const totalAmount = parseFloat(loan.amount) + (parseFloat(loan.amount) * parseFloat(loan.interest_rate) / 100) + parseFloat(loan.penalty_amount || 0);
      
      // Determine repayment status
      let repaymentStatus = 'pending';
      let status = loan.status;
      
      if (newRepaidAmount >= totalAmount) {
        repaymentStatus = 'completed';
        status = 'paid';
      } else if (newRepaidAmount > 0) {
        repaymentStatus = 'partial';
      }
      
      // Update loan record
      const updateQuery = `
        UPDATE loan_requests
        SET repaid_amount = $2, 
            repayment_status = $3, 
            status = $4,
            last_repayment_date = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const updateResult = await client.query(updateQuery, [loanId, newRepaidAmount, repaymentStatus, status]);
      
      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Apply penalty to overdue loans
  static async applyPenalty(loanId, penaltyRate) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get current loan details
      const loanQuery = 'SELECT * FROM loan_requests WHERE id = $1';
      const loanResult = await client.query(loanQuery, [loanId]);
      const loan = loanResult.rows[0];
      
      if (!loan) {
        throw new Error('Loan not found');
      }
      
      // Calculate penalty amount
      const penaltyAmount = parseFloat(loan.amount) * (parseFloat(penaltyRate) / 100);
      
      // Update loan record
      const updateQuery = `
        UPDATE loan_requests
        SET penalty_rate = $2, 
            penalty_amount = $3, 
            status = 'overdue'
        WHERE id = $1
        RETURNING *
      `;
      const updateResult = await client.query(updateQuery, [loanId, penaltyRate, penaltyAmount]);
      
      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Check for overdue loans
  static async findOverdueLoans() {
    const query = `
      SELECT lr.*, g.name as group_name, u.name as user_name, u.email as user_email
      FROM loan_requests lr
      JOIN groups g ON lr.group_id = g.id
      JOIN users u ON lr.user_id = u.id
      WHERE lr.status = 'approved' 
      AND lr.due_date < CURRENT_TIMESTAMP
      AND lr.repayment_status != 'completed'
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Check if a group has any approved loans in the current month
  static async hasApprovedLoanInCurrentMonth(groupId) {
    const query = `
      SELECT COUNT(*) as loan_count
      FROM loan_requests
      WHERE group_id = $1
      AND status = 'approved'
      AND approved_at >= date_trunc('month', CURRENT_TIMESTAMP)
      AND approved_at < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month'
    `;
    const result = await pool.query(query, [groupId]);
    return parseInt(result.rows[0].loan_count) > 0;
  }
}

module.exports = Loan;