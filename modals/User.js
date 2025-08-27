const pool = require('../config/neondb');

const  User = {
    create: async (userData) =>{
        const { name , email , password} = userData;

        const query =`
        
        INSERT INTO users(name,email,password)
        VALUES($1,$2,$3)
        RETURNING id,name,email,created_at
        `;

        const values = [name,email,password];
        const {rows} = await pool.query(query,values);
        return rows[0];
    },

    //Find user by email
    findByEmail: async (email) =>{
        const query  = `
        SELECT * FROM users WHERE email = $1
        `;
        const {rows} = await pool.query(query,[email]);
        return rows[0];
    },

  // Update user verification status
  verify: async (id) => {
    const query = 'UPDATE users SET verified = true WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  //Update user password
  updatePassword : async (id,password) =>{
    const query = `UPDATE users SET password = $1 WHERE id = $2 RETURNING id, name,email`;
    const {rows} = await pool.query(query,[password,id]);
    return rows[0];
  }
};

module.exports = User;