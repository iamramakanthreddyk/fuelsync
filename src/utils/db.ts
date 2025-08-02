import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables (same as working Azure script)
dotenv.config();

console.log('[DB] Environment:', process.env.NODE_ENV);

// Determine connection method: connection string vs Azure parameters
const useConnectionString = process.env.POSTGRES_URL || process.env.NILEDB_URL || process.env.DATABASE_URL;
const useAzureParams = process.env.DB_HOST && process.env.DB_USER;

let pool: Pool;

if (useConnectionString) {
  const connectionString = process.env.POSTGRES_URL || process.env.NILEDB_URL || process.env.DATABASE_URL;
  console.log('[DB] Using connection string');
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, // Increased timeout for Azure
    idleTimeoutMillis: 10000,
    max: 1
  });
} else if (useAzureParams) {
  console.log('[DB] Using Azure PostgreSQL params');
  console.log('[DB] Host:', process.env.DB_HOST || 'NOT_SET');
  console.log('[DB] User:', process.env.DB_USER || 'NOT_SET');
  console.log('[DB] Database:', process.env.DB_NAME || 'NOT_SET');
  console.log('[DB] Port:', process.env.DB_PORT || 'DEFAULT');

  // Check if the host is an Azure PostgreSQL server
  const isAzurePostgres = process.env.DB_HOST?.includes('postgres.database.azure.com');
  console.log('[DB] Is Azure PostgreSQL:', isAzurePostgres);

  // Use exact same configuration as working script
  pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }, // Exact same as working script
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 20
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
      host: process.env.DB_HOST ? 'SET' : 'NOT_SET',
      user: process.env.DB_USER ? 'SET' : 'NOT_SET',
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
