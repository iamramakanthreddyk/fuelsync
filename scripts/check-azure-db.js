/**
 * Script to check Azure database connection
 * Run with: node scripts/check-azure-db.js
 */
const { Pool } = require('pg');
require('dotenv').config();

async function checkAzureConnection() {
  console.log('=== Azure Database Connection Test ===');
  console.log('Environment:', process.env.NODE_ENV);
  
  // Check for connection parameters
  const connectionParams = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || '5432',
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
  };
  
  console.log('Connection parameters:');
  Object.entries(connectionParams).forEach(([key, value]) => {
    console.log(`- ${key}: ${value ? (key === 'password' ? '******' : value) : 'NOT SET'}`);
  });
  
  // Try connection string first if available
  let pool;
  let useConnectionString = false;
  
  if (connectionParams.connectionString) {
    console.log('\nTrying connection using connection string...');
    useConnectionString = true;
    pool = new Pool({
      connectionString: connectionParams.connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });
  } else if (connectionParams.host && connectionParams.user && connectionParams.database) {
    console.log('\nTrying connection using individual parameters...');
    pool = new Pool({
      host: connectionParams.host,
      port: Number(connectionParams.port),
      user: connectionParams.user,
      password: process.env.DB_PASSWORD,
      database: connectionParams.database,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });
  } else {
    console.error('\nERROR: Insufficient connection parameters provided.');
    console.error('Please set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME or a connection string.');
    process.exit(1);
  }
  
  try {
    console.log('\nAttempting to connect to database...');
    const client = await pool.connect();
    console.log('Successfully connected to database!');
    
    console.log('\nExecuting test query...');
    const result = await client.query('SELECT NOW() as time, current_database() as database, version() as version');
    console.log('Query executed successfully!');
    
    console.log('\nDatabase information:');
    console.log(`- Time: ${result.rows[0].time}`);
    console.log(`- Database: ${result.rows[0].database}`);
    console.log(`- Version: ${result.rows[0].version}`);
    
    // Check for tables
    console.log('\nChecking for tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in the public schema.');
    } else {
      console.log(`Found ${tablesResult.rows.length} tables:`);
      tablesResult.rows.forEach((row, i) => {
        console.log(`- ${row.table_name}`);
        if (i >= 9 && tablesResult.rows.length > 10) {
          console.log(`  ... and ${tablesResult.rows.length - 10} more`);
          return;
        }
      });
    }
    
    client.release();
    console.log('\nConnection test completed successfully!');
  } catch (err) {
    console.error('\nERROR: Database connection failed:');
    console.error(`- Message: ${err.message}`);
    console.error(`- Code: ${err.code}`);
    
    if (err.code === 'ENOTFOUND') {
      console.error('\nThe host could not be found. Please check:');
      console.error('1. The DB_HOST value is correct');
      console.error('2. Your network can reach the host (no firewall blocking)');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('\nConnection was refused. Please check:');
      console.error('1. The database server is running');
      console.error('2. The port is correct (default is 5432)');
      console.error('3. Firewall rules allow connections from your IP');
    } else if (err.code === '28P01') {
      console.error('\nAuthentication failed. Please check:');
      console.error('1. The DB_USER value is correct');
      console.error('2. The DB_PASSWORD value is correct');
    } else if (err.code === '3D000') {
      console.error('\nDatabase does not exist. Please check:');
      console.error('1. The DB_NAME value is correct');
      console.error('2. The database has been created on the server');
    }
    
    console.error('\nFull error:', err);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

checkAzureConnection().catch(console.error);