import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export const pool = new Pool({
  host: process.env.DB_HOST || process.env.PGHOST,
  port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
  user: process.env.DB_USER || process.env.PGUSER,
  password: process.env.DB_PASS || process.env.PGPASSWORD,
  database: process.env.DB_NAME || process.env.PGDATABASE,
});

export async function createTestSchema() {
  const schema = process.env.TEST_SCHEMA || 'test_schema';
  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  } catch (err: any) {
    console.warn('Skipping schema creation:', err.message);
  }
}

export async function dropTestSchema() {
  const schema = process.env.TEST_SCHEMA || 'test_schema';
  try {
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  } catch (err: any) {
    console.warn('Skipping schema drop:', err.message);
  }
}
