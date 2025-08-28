const pool = require('../config/neondb');
const { generateGroupCode } = require('../services/groupService');

const Group = {
  // Create a new group
  create: async (groupData) => {
    const { name, description, created_by } = groupData;
    const group_code = generateGroupCode();
    
    const query = `
      INSERT INTO groups (name, description, group_code, created_by) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;
    const values = [name, description, group_code, created_by];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Find group by ID
  findById: async (id) => {
    const query = `
      SELECT g.*, u.name as leader_name, u.email as leader_email
      FROM groups g
      JOIN users u ON g.created_by = u.id
      WHERE g.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  // Find group by code
  findByCode: async (code) => {
    const query = `
      SELECT g.*, u.name as leader_name, u.email as leader_email
      FROM groups g
      JOIN users u ON g.created_by = u.id
      WHERE g.group_code = $1
    `;
    const { rows } = await pool.query(query, [code]);
    return rows[0];
  },

  // Update group
  update: async (id, updates) => {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    const query = `
      UPDATE groups 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1}
      RETURNING *
    `;
    const { rows } = await pool.query(query, [...values, id]);
    return rows[0];
  },

  // Delete group
  delete: async (id) => {
    const query = 'DELETE FROM groups WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  // Get all groups for a user
  findByUserId: async (userId) => {
    const query = `
      SELECT g.*, gm.role, gm.status as membership_status
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }
};

module.exports = Group;