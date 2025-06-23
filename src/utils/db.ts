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
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000
});

export default pool;
