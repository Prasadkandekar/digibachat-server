const pool = require('../config/neondb');

const  OTP = {
    create : async (userId , otp , expiresAt)=>{
        await pool.query(
            `DELETE FROM otps WHERE user_id = $1`,[userId]
        );

        const query = `
      INSERT INTO otps (user_id, otp, expires_at) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `;
    const values = [userId, otp, expiresAt];
    const { rows } = await pool.query(query, values);
    return rows[0];
    },

    // Find valid OTP for user
  findValidOTP: async (userId, otp) => {
    const query = `
      SELECT * FROM otps 
      WHERE user_id = $1 AND otp = $2 AND expires_at > NOW() AND used = false
    `;
    const { rows } = await pool.query(query, [userId, otp]);
    return rows[0];
  },

  // Mark OTP as used
  markAsUsed: async (id) => {
    const query = 'UPDATE otps SET used = true WHERE id = $1';
    await pool.query(query, [id]);
  },

  // Clean up expired OTPs
  cleanupExpired: async () => {
    await pool.query('DELETE FROM otps WHERE expires_at < NOW()');
  }


};

module.exports = OTP;
