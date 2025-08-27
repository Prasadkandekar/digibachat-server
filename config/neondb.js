const {Pool} = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:{
        rejectUnauthorized:false
    }
});


//lets test the connection:
pool.connect((err,client , release) =>{
    if(err){
        console.error('Error acquiring client', err.stack)
    }else{
        console.log('NeonDB connected successfully /😍');
        release();
    }
});

module.exports = pool;
