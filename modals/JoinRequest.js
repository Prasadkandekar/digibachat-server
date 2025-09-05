const pool = require('../config/neondb');

class JoinRequest {
  static async create({ group_id, user_id }) {
    const query = `
      INSERT INTO join_requests (group_id, user_id, status)
      VALUES ($1, $2, 'pending')
      ON CONFLICT (group_id, user_id) 
      DO UPDATE SET status = 'pending', created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [group_id, user_id]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT jr.*, u.name as user_name, u.email, g.name as group_name
      FROM join_requests jr
      LEFT JOIN users u ON jr.user_id = u.id
      LEFT JOIN groups g ON jr.group_id = g.id
      WHERE jr.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByGroupId(groupId, status = null) {
    let query = `
      SELECT jr.*, u.name as user_name, u.email, u.phone, jr.created_at as requested_at
      FROM join_requests jr
      LEFT JOIN users u ON jr.user_id = u.id
      WHERE jr.group_id = $1
    `;
    
    const params = [groupId];
    if (status) {
      query += ' AND jr.status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY jr.created_at DESC';
    console.log(`JoinRequest.findByGroupId query:`, query);
    console.log(`JoinRequest.findByGroupId params:`, params);
    const result = await pool.query(query, params);
    console.log(`JoinRequest.findByGroupId result:`, result.rows);
    return result.rows;
  }

  static async updateStatus(id, status, reviewed_by) {
    const query = `
      UPDATE join_requests 
      SET status = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id, status, reviewed_by]);
    return result.rows[0];
  }

  static async hasPendingRequest(groupId, userId) {
    const query = `
      SELECT id FROM join_requests 
      WHERE group_id = $1 AND user_id = $2 AND status = 'pending'
    `;
    const result = await pool.query(query, [groupId, userId]);
    return result.rows.length > 0;
  }
}

module.exports = JoinRequest;