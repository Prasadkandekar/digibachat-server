const pool = require('../config/neondb');

const JoinRequest = {
  // Create join request
  create: async (requestData) => {
    const { group_id, user_id } = requestData;
    
    const query = `
      INSERT INTO group_join_requests (group_id, user_id) 
      VALUES ($1, $2) 
      RETURNING *
    `;
    const values = [group_id, user_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Find request by ID
  findById: async (id) => {
    const query = `
      SELECT jr.*, u.name as user_name, u.email as user_email, g.name as group_name
      FROM group_join_requests jr
      JOIN users u ON jr.user_id = u.id
      JOIN groups g ON jr.group_id = g.id
      WHERE jr.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  // Find requests by group
  findByGroupId: async (group_id, status = 'pending') => {
    const query = `
      SELECT jr.*, u.name as user_name, u.email as user_email
      FROM group_join_requests jr
      JOIN users u ON jr.user_id = u.id
      WHERE jr.group_id = $1 AND jr.status = $2
      ORDER BY jr.requested_at DESC
    `;
    const { rows } = await pool.query(query, [group_id, status]);
    return rows;
  },

  // Update request status
  updateStatus: async (id, status, reviewed_by) => {
    const query = `
      UPDATE group_join_requests 
      SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const values = [status, reviewed_by, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Check if user has pending request
  hasPendingRequest: async (group_id, user_id) => {
    const query = `
      SELECT COUNT(*) FROM group_join_requests 
      WHERE group_id = $1 AND user_id = $2 AND status = 'pending'
    `;
    const { rows } = await pool.query(query, [group_id, user_id]);
    return parseInt(rows[0].count) > 0;
  }
};

module.exports = JoinRequest;