import pool from '../src/utils/db';

async function checkDatabaseConnection() {
  console.log('Testing database connection...');
  
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to the database');
    
    try {
      // Test a simple query
      const result = await client.query('SELECT current_database() as db_name, current_user as user_name');
      console.log(`Connected to database: ${result.rows[0].db_name} as user: ${result.rows[0].user_name}`);
      
      // Check if public schema exists
      const schemaResult = await client.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'public'
      `);
      
      if (schemaResult.rows.length > 0) {
        console.log('✅ Public schema exists');
        
        // Check if admin_users table exists
        try {
          const tableResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'admin_users'
          `);
          
          if (tableResult.rows.length > 0) {
            console.log('✅ admin_users table exists');
          } else {
            console.log('❌ admin_users table does not exist - database may not be initialized');
          }
        } catch (err: any) {
          console.error('Error checking admin_users table:', err.message);
        }
      } else {
        console.log('❌ Public schema does not exist - database may not be initialized');
      }
    } catch (err: any) {
      console.error('Error executing query:', err.message);
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('❌ Failed to connect to the database:', err.message);
    console.log('\nPossible issues:');
    console.log('1. Database server is not running');
    console.log('2. Connection credentials in .env file are incorrect');
    console.log('3. Network connectivity issues');
    
    // Check if .env file exists and has DB connection info
    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.join(process.cwd(), '.env');
      
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        console.log('\nFound .env file. Checking for database configuration:');
        
        const dbVars = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGPORT'];
        const missingVars = dbVars.filter(v => !envContent.includes(v));
        
        if (missingVars.length > 0) {
          console.log(`❌ Missing database variables in .env: ${missingVars.join(', ')}`);
        } else {
          console.log('✅ All required database variables found in .env');
        }
      } else {
        console.log('❌ .env file not found');
      }
    } catch (envErr: any) {
      console.error('Error checking .env file:', envErr.message);
    }
  }
}

checkDatabaseConnection().finally(() => {
  process.exit(0);
});