const { initTestDb } = require('./scripts/init-test-db.js');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.test' });

module.exports = async () => {
  await initTestDb();
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
};
