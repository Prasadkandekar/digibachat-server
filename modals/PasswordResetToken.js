const pool = require('../config/neondb');


const PasswordResetToken = {
    create : async(userId, token, expiresAt) => {
        await pool.query(
            `DELETE FROM password_reset_tokens WHERE user_id = $1`,[userId]
        );

        const query = 
            `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
             VALUES ($1, $2, $3) RETURNING *`;
         const values = [userId, token, expiresAt];
        const { rows } = await pool.query(query, values);
        return rows[0];
    },


    // Find a token by its value
    findValidToken: async (token) => {
    const query = `
      SELECT * FROM password_reset_tokens 
      WHERE token = $1 AND expires_at > NOW() AND used = false
    `;
    const { rows } = await pool.query(query, [token]);
    return rows[0];
  },

  // Mark a token as used
  markAsUsed: async (id) => {
    const query = 'UPDATE password_reset_tokens SET used = true WHERE id = $1';
    await pool.query(query, [id]);
  },

   // Clean up expired tokens
  cleanupExpired: async () => {
    await pool.query('DELETE FROM password_reset_tokens WHERE expires_at < NOW()');
  }
};

module.exports = PasswordResetToken;