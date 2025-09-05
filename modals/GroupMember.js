const pool = require('../config/neondb');

class GroupMember {
  static async add({ group_id, user_id, role = 'member', status = 'pending' }) {
    const query = `
      INSERT INTO group_members (group_id, user_id, role, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (group_id, user_id) 
      DO UPDATE SET status = $4, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [group_id, user_id, role, status]);
    return result.rows[0];
  }

  static async findByGroupAndUser(groupId, userId) {
    const query = `
      SELECT gm.*, u.name, u.email
      FROM group_members gm
      LEFT JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1 AND gm.user_id = $2
    `;
    const result = await pool.query(query, [groupId, userId]);
    return result.rows[0];
  }

  static async findByGroupId(groupId, status = null) {
    let query = `
      SELECT gm.*, u.name, u.email, u.phone
      FROM group_members gm
      LEFT JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
    `;
    
    const params = [groupId];
    if (status) {
      query += ' AND gm.status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY gm.role DESC, gm.joined_at ASC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async updateStatus(groupId, userId, status) {
    const query = `
      UPDATE group_members 
      SET status = $3, updated_at = CURRENT_TIMESTAMP
      WHERE group_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [groupId, userId, status]);
    return result.rows[0];
  }

  static async remove(groupId, userId) {
    const query = `
      DELETE FROM group_members 
      WHERE group_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [groupId, userId]);
    return result.rows[0];
  }

  static async isLeader(groupId, userId) {
    const query = `
      SELECT role FROM group_members 
      WHERE group_id = $1 AND user_id = $2 AND status = 'approved'
    `;
    console.log(`Checking if user ${userId} is leader of group ${groupId}`);
    const result = await pool.query(query, [groupId, userId]);
    console.log(`GroupMember query result:`, result.rows);
    const isLeader = result.rows[0]?.role === 'leader';
    console.log(`Is leader result:`, isLeader);
    return isLeader;
  }

  static async isApprovedMember(groupId, userId) {
    const query = `
      SELECT id FROM group_members 
      WHERE group_id = $1 AND user_id = $2 AND status = 'approved'
    `;
    const result = await pool.query(query, [groupId, userId]);
    return result.rows.length > 0;
  }
}

module.exports = GroupMember;