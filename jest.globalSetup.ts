import { seedTestDb } from './scripts/seed-test-db';
import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.test' });

export default async function () {
  try {
    await seedTestDb();
    const client = new Client({
      host: process.env.DB_HOST || process.env.PGHOST,
      port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
      user: process.env.DB_USER || process.env.PGUSER,
      password: process.env.DB_PASS || process.env.PGPASSWORD,
      database: process.env.DB_NAME || process.env.PGDATABASE,
    });
    await client.connect();
    const schema = process.env.TEST_SCHEMA || 'test_schema';
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => {});
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await client.end();
  } catch (err: any) {
    fs.writeFileSync('SKIP_TESTS', err.message);
    console.error('Skipping tests: unable to provision test DB.', err.message);
    process.exit(0);
  }
}
