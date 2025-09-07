const { Pool } = require('pg');
require('dotenv').config();

async function checkLoanRequests() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check if loan_requests table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'loan_requests'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.error('Error: loan_requests table does not exist');
      return;
    }

    // Get count of loan requests
    const countResult = await pool.query('SELECT COUNT(*) FROM loan_requests');
    console.log(`Total loan requests: ${countResult.rows[0].count}`);

    // Get sample loan requests
    const result = await pool.query('SELECT * FROM loan_requests LIMIT 5');
    console.log('Sample loan requests:');
    console.table(result.rows);

    // Check if there are any groups with loans
    const groupsWithLoans = await pool.query(`
      SELECT group_id, COUNT(*) as loan_count 
      FROM loan_requests 
      GROUP BY group_id
    `);
    console.log('\nGroups with loan requests:');
    console.table(groupsWithLoans.rows);

  } catch (error) {
    console.error('Error checking loan requests:', error);
  } finally {
    await pool.end();
  }
}

checkLoanRequests();
