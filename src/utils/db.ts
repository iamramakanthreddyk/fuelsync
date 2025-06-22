import { Pool } from 'pg';
import dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.development';
dotenv.config({ path: envFile });

const pool = new Pool({
  host: process.env.DB_HOST || process.env.PGHOST,
  port: Number(process.env.DB_PORT || process.env.PGPORT || '5432'),
  user: process.env.DB_USER || process.env.PGUSER,
  password: process.env.DB_PASS || process.env.PGPASSWORD,
  database: process.env.DB_NAME || process.env.PGDATABASE,
});

export default pool;
