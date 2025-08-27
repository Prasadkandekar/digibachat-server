const pool = require('../config/database');

const BlacklistedToken = {
  // Add token to blacklist
  add: async (token, expiresAt) => {
    const query = `
      INSERT INTO blacklisted_tokens (token, expires_at) 
      VALUES ($1, $2) 
      RETURNING *
    `;
    const values = [token, expiresAt];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Check if token is blacklisted
  isBlacklisted: async (token) => {
    const query = `
      SELECT * FROM blacklisted_tokens 
      WHERE token = $1 AND expires_at > NOW()
    `;
    const { rows } = await pool.query(query, [token]);
    return rows.length > 0;
  },

  // Clean up expired tokens
  cleanupExpired: async () => {
    await pool.query('DELETE FROM blacklisted_tokens WHERE expires_at < NOW()');
  }
};

module.exports = BlacklistedToken;