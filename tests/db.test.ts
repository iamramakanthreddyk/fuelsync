import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: `.env.development` });

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

describe('📦 Public Schema – Structure', () => {
  beforeAll(() => client.connect());
  afterAll(() => client.end());

  test('🧱 Table exists: plans', async () => {
    const res = await client.query("SELECT to_regclass('public.plans') AS exists");
    expect(res.rows[0].exists).toBe('public.plans');
  });

  test('🔐 DEFERRABLE constraints exist', async () => {
    const res = await client.query(`
      SELECT conname, deferrable
      FROM pg_constraint
      WHERE conname = 'fk_tenant_plan_id'
    `);
    expect(res.rows[0]?.deferrable).toBe(true);
  });
});
