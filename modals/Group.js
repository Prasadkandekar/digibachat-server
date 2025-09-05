const { Pool } = require('pg');
const pool = require('../config/neondb');

class Group {
  static async create({ name, description, created_by, savings_frequency, savings_amount, interest_rate, default_loan_duration }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Generate unique group code
      const groupCode = await this.generateUniqueGroupCode();
      
      const groupQuery = `
        INSERT INTO groups (name, description, group_code, created_by, savings_frequency, savings_amount, interest_rate, default_loan_duration)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const groupResult = await client.query(groupQuery, [
        name, 
        description, 
        groupCode, 
        created_by, 
        savings_frequency, 
        savings_amount, 
        interest_rate, 
        default_loan_duration
      ]);
      
      await client.query('COMMIT');
      return groupResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async generateUniqueGroupCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let isUnique = false;
    let code;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      const checkQuery = 'SELECT id FROM groups WHERE group_code = $1';
      const checkResult = await pool.query(checkQuery, [code]);
      isUnique = checkResult.rows.length === 0;
    }
    
    return code;
  }

  static async findById(id) {
    const query = `
      SELECT g.*, u.name as leader_name, u.email as leader_email
      FROM groups g
      LEFT JOIN users u ON g.created_by = u.id
      WHERE g.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByCode(groupCode) {
    const query = `
      SELECT g.*, u.name as leader_name, u.email as leader_email
      FROM groups g
      LEFT JOIN users u ON g.created_by = u.id
      WHERE g.group_code = $1
    `;
    const result = await pool.query(query, [groupCode]);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = `
      SELECT g.*, gm.role, gm.status as member_status, gm.joined_at
      FROM groups g
      INNER JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1 AND gm.status = 'approved'
      ORDER BY gm.joined_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findByUserIdAndRole(userId, role) {
    const query = `
      SELECT g.*, gm.role, gm.status as member_status, gm.joined_at
      FROM groups g
      INNER JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1 AND gm.role = $2 AND gm.status = 'approved'
      ORDER BY gm.joined_at DESC
    `;
    const result = await pool.query(query, [userId, role]);
    return result.rows;
  }

  static async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE groups 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  }

  static async delete(id, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if user is the group creator
      const groupQuery = 'SELECT created_by FROM groups WHERE id = $1';
      const groupResult = await client.query(groupQuery, [id]);
      
      if (groupResult.rows[0].created_by !== userId) {
        throw new Error('Only group creator can delete the group');
      }

      // Hard delete for now since we don't have is_active column
      const deleteQuery = `
        DELETE FROM groups 
        WHERE id = $1
        RETURNING *
      `;
      const result = await client.query(deleteQuery, [id]);
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Group;