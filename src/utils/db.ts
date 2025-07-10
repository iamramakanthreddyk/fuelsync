import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Only load .env files in development
if (process.env.NODE_ENV !== 'production') {
  const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.development';
  dotenv.config({ path: envFile });
} else {
  // In production, try to load .env file anyway as a fallback
  try {
    if (fs.existsSync('.env')) {
      console.log('[DB] Loading .env file in production as fallback');
      dotenv.config();
    }
  } catch (err) {
    console.warn('[DB] Error checking for .env file:', err);
  }
}

console.log('[DB] Environment:', process.env.NODE_ENV);
console.log('[DB] Available env vars:', Object.keys(process.env).filter(key => 
  key.startsWith('DB_') || key.includes('POSTGRES') || key.includes('DATABASE')
));

// Determine connection method: connection string vs Azure parameters
const useConnectionString = process.env.POSTGRES_URL || process.env.NILEDB_URL || process.env.DATABASE_URL;
const useAzureParams = process.env.DB_HOST && process.env.DB_USER;

let pool: Pool;

if (useConnectionString) {
  const connectionString = process.env.POSTGRES_URL || process.env.NILEDB_URL || process.env.DATABASE_URL;
  console.log('[DB] Using connection string:', connectionString?.substring(0, 20) + '...');
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, // Increased timeout for Azure
    idleTimeoutMillis: 10000,
    max: 1
  });
} else if (useAzureParams) {
  console.log('[DB] Using Azure PostgreSQL params');
  console.log('[DB] Host:', process.env.DB_HOST);
  console.log('[DB] User:', process.env.DB_USER);
  console.log('[DB] Database:', process.env.DB_NAME);
  console.log('[DB] Port:', process.env.DB_PORT || '5432');
  
  // Check if the host is an Azure PostgreSQL server
  const isAzurePostgres = process.env.DB_HOST?.includes('postgres.database.azure.com');
  console.log('[DB] Is Azure PostgreSQL:', isAzurePostgres);
  
  pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, // Increased timeout for Azure
    idleTimeoutMillis: 10000,
    max: process.env.NODE_ENV === 'production' ? 2 : 10, // Increased max connections for production
    application_name: 'fuelsync-api' // Add application name for better monitoring
  });
} else {
  console.error('[DB] No database configuration found!');
  console.error('[DB] Environment variables available:', process.env);
  throw new Error('Database configuration missing');
}

// Test connection on startup
pool.on('error', (err) => {
  console.error('[DB] Pool error:', err);
});

// Add connection test function with enhanced logging
export async function testConnection() {
  try {
    console.log('[DB] Testing connection with config:', {
      host: process.env.DB_HOST ? 'SET' : 'NOT_SET',
      user: process.env.DB_USER ? 'SET' : 'NOT_SET', 
      database: process.env.DB_NAME ? 'SET' : 'NOT_SET',
      port: process.env.DB_PORT || '5432',
      connectionString: process.env.POSTGRES_URL || process.env.NILEDB_URL || process.env.DATABASE_URL ? 'SET' : 'NOT_SET'
    });
    
    // Check pool status
    console.log('[DB] Pool status:', {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    });
    
    console.log('[DB] Attempting to connect to database...');
    const client = await pool.connect();
    console.log('[DB] Successfully acquired client from pool');
    
    console.log('[DB] Executing test query...');
    const result = await client.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    console.log('[DB] Test query executed successfully');
    
    client.release();
    console.log('[DB] Client released back to pool');
    
    console.log('[DB] Connection test successful:', {
      time: result.rows[0].current_time,
      database: result.rows[0].db_name,
      version: result.rows[0].pg_version?.substring(0, 50) + '...'
    });
    
    return { 
      success: true, 
      time: result.rows[0].current_time,
      database: result.rows[0].db_name,
      version: result.rows[0].pg_version,
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    };
  } catch (err: any) {
    console.error('[DB] Connection test failed:', {
      message: err.message,
      code: err.code,
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      stack: err.stack
    });
    
    // Try to get more detailed error information
    let additionalInfo = {};
    try {
      if (err.code === 'ENOTFOUND') {
        additionalInfo = { detail: 'Host not found. Check DNS resolution.' };
      } else if (err.code === 'ECONNREFUSED') {
        additionalInfo = { detail: 'Connection refused. Check if database server is running and accessible.' };
      } else if (err.code === 'ETIMEDOUT') {
        additionalInfo = { detail: 'Connection timed out. Check network connectivity and firewall rules.' };
      } else if (err.code === '28P01') {
        additionalInfo = { detail: 'Invalid authentication credentials.' };
      } else if (err.code === '3D000') {
        additionalInfo = { detail: 'Database does not exist.' };
      }
    } catch (infoErr) {
      console.error('[DB] Error getting additional info:', infoErr);
    }
    
    return { 
      success: false, 
      error: err.message, 
      code: err.code,
      stack: err.stack,
      ...additionalInfo
    };
  }
}

export default pool;
