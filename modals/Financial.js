const pool = require('../config/neondb');

const Financial = {
  // Check if user has active loans in group
  hasActiveLoans: async (group_id, user_id) => {
    const query = `
      SELECT COUNT(*) FROM loans 
      WHERE group_id = $1 AND borrower_id = $2 AND status = 'active'
    `;
    const { rows } = await pool.query(query, [group_id, user_id]);
    return parseInt(rows[0].count) > 0;
  },

  // Check if user has savings in group
  hasSavings: async (group_id, user_id) => {
    const query = `
      SELECT COUNT(*) FROM savings 
      WHERE group_id = $1 AND user_id = $2
    `;
    const { rows } = await pool.query(query, [group_id, user_id]);
    return parseInt(rows[0].count) > 0;
  },

  // Get total savings amount for user in group
  getTotalSavings: async (group_id, user_id) => {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total_savings 
      FROM savings 
      WHERE group_id = $1 AND user_id = $2
    `;
    const { rows } = await pool.query(query, [group_id, user_id]);
    return parseFloat(rows[0].total_savings);
  },

  // Get total active loan amount for user in group
  getTotalActiveLoans: async (group_id, user_id) => {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total_loans 
      FROM loans 
      WHERE group_id = $1 AND borrower_id = $2 AND status = 'active'
    `;
    const { rows } = await pool.query(query, [group_id, user_id]);
    return parseFloat(rows[0].total_loans);
  }
};

module.exports = Financial;