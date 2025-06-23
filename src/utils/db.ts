import { Pool } from 'pg';
import dotenv from 'dotenv';

// Only load .env files in development
if (process.env.NODE_ENV !== 'production') {
  const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.development';
  dotenv.config({ path: envFile });
}

console.log('[DB] Environment:', process.env.NODE_ENV);
console.log('[DB] Host:', process.env.DB_HOST || 'NOT_SET');
console.log('[DB] User:', process.env.DB_USER || 'NOT_SET');
console.log('[DB] Database:', process.env.DB_NAME || 'NOT_SET');

const pool = new Pool({
  host: process.env.DB_HOST || process.env.PGHOST,
  port: Number(process.env.DB_PORT || process.env.PGPORT || '5432'),
  user: process.env.DB_USER || process.env.PGUSER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS || process.env.PGPASSWORD,
  database: process.env.DB_NAME || process.env.PGDATABASE,
  ssl: { 
    rejectUnauthorized: false,
    require: true
  },
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 10000,
  max: 1, // Limit connections for serverless
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Test connection on startup
pool.on('error', (err) => {
  console.error('[DB] Pool error:', err);
});

// Add connection test function
export async function testConnection() {
  try {
    console.log('[DB] Testing connection with config:', {
      host: process.env.DB_HOST ? 'SET' : 'NOT_SET',
      user: process.env.DB_USER ? 'SET' : 'NOT_SET', 
      database: process.env.DB_NAME ? 'SET' : 'NOT_SET',
      port: process.env.DB_PORT || '5432'
    });
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();
    console.log('[DB] Connection test successful:', result.rows[0]);
    return { success: true, time: result.rows[0].current_time };
  } catch (err: any) {
    console.error('[DB] Connection test failed:', {
      message: err.message,
      code: err.code,
      host: process.env.DB_HOST,
      user: process.env.DB_USER
    });
    return { success: false, error: err.message, code: err.code };
  }
}

export default pool;
