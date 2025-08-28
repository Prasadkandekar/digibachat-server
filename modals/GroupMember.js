const pool = require('../config/neondb');

const GroupMember = {
  // Add member to group
  add: async (memberData) => {
    const { group_id, user_id, role = 'member', status = 'pending' } = memberData;
    
    const query = `
      INSERT INTO group_members (group_id, user_id, role, status) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;
    const values = [group_id, user_id, role, status];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Find member by group and user
  findByGroupAndUser: async (group_id, user_id) => {
    const query = `
      SELECT gm.*, u.name, u.email
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1 AND gm.user_id = $2
    `;
    const { rows } = await pool.query(query, [group_id, user_id]);
    return rows[0];
  },

  // Get all members of a group
  findByGroupId: async (group_id, status = null) => {
    let query = `
      SELECT gm.*, u.name, u.email
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
    `;
    
    let values = [group_id];
    
    if (status) {
      query += ' AND gm.status = $2';
      values.push(status);
    }
    
    query += ' ORDER BY gm.role DESC, u.name ASC';
    
    const { rows } = await pool.query(query, values);
    return rows;
  },

  // Update member status
  updateStatus: async (group_id, user_id, status, reviewed_by = null) => {
    const query = `
      UPDATE group_members 
      SET status = $1, joined_at = CASE WHEN $1 = 'approved' THEN CURRENT_TIMESTAMP ELSE joined_at END
      WHERE group_id = $2 AND user_id = $3
      RETURNING *
    `;
    const values = [status, group_id, user_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Remove member from group
  remove: async (group_id, user_id) => {
    const query = `
      DELETE FROM group_members 
      WHERE group_id = $1 AND user_id = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [group_id, user_id]);
    return rows[0];
  },

  // Check if user is group leader
  isLeader: async (group_id, user_id) => {
    const query = `
      SELECT * FROM group_members 
      WHERE group_id = $1 AND user_id = $2 AND role = 'leader' AND status = 'approved'
    `;
    const { rows } = await pool.query(query, [group_id, user_id]);
    return rows.length > 0;
  },

  // Check if user is approved member
  isApprovedMember: async (group_id, user_id) => {
    const query = `
      SELECT * FROM group_members 
      WHERE group_id = $1 AND user_id = $2 AND status = 'approved'
    `;
    const { rows } = await pool.query(query, [group_id, user_id]);
    return rows.length > 0;
  }
};

module.exports = GroupMember;