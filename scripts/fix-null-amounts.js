/**
 * Script to fix null amounts in sales records
 * 
 * This script updates sales records where the amount is null by calculating
 * the amount based on the volume and fuel price.
 */
const { Pool } = require('pg');
require('dotenv').config();

async function fixNullAmounts() {
  console.log('=== Fix Null Amounts in Sales Records ===');
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
  
  if (connectionParams.connectionString) {
    console.log('\nTrying connection using connection string...');
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
    console.log('\nConnecting to database...');
    const client = await pool.connect();
    console.log('Successfully connected to database!');
    
    try {
      console.log('Finding sales records with null amounts...');
      
      // Find sales records with null amounts
      const findResult = await client.query(`
        SELECT 
          s.id, 
          s.volume, 
          s.fuel_price, 
          s.tenant_id
        FROM 
          public.sales s
        WHERE 
          s.amount IS NULL OR s.amount = 0
      `);
      
      console.log(`Found ${findResult.rowCount} sales records with null or zero amounts.`);
      
      if (findResult.rowCount > 0) {
        console.log('Updating sales records...');
        
        // Update each record
        let updatedCount = 0;
        for (const row of findResult.rows) {
          const { id, volume, fuel_price, tenant_id } = row;
          const amount = parseFloat(volume) * parseFloat(fuel_price);
          
          if (!isNaN(amount) && amount > 0) {
            await client.query(`
              UPDATE public.sales
              SET amount = $1, updated_at = NOW()
              WHERE id = $2 AND tenant_id = $3
            `, [amount, id, tenant_id]);
            updatedCount++;
          } else {
            console.log(`Skipping record ${id} due to invalid calculation: volume=${volume}, price=${fuel_price}`);
          }
        }
        
        console.log(`Updated ${updatedCount} sales records with calculated amounts.`);
      }
      
      console.log('Done!');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error fixing null amounts:', err);
  } finally {
    await pool.end();
  }
}

fixNullAmounts().catch(console.error);