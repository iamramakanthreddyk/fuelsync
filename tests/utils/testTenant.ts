import { pool } from './db-utils';
import bcrypt from 'bcrypt';

export async function createTenant(schema = 'test_tenant') {
  const { rows: planRows } = await pool.query(
    `SELECT id FROM public.plans LIMIT 1`
  );
  const planId = planRows[0].id;
  await pool.query(
    `INSERT INTO public.tenants (name, schema_name, plan_id)
     VALUES ($1,$2,$3)
     ON CONFLICT (schema_name) DO NOTHING`,
    [schema, schema, planId]
  );
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
}

export async function createUser(schema: string, role: string) {
  const hash = await bcrypt.hash('password', 1);
  await pool.query(
    `INSERT INTO ${schema}.users (tenant_id, email, password_hash, role)
     SELECT id, $1, $2, $3 FROM public.tenants WHERE schema_name=$4
     ON CONFLICT (email) DO NOTHING`,
    [`${role}@${schema}.com`, hash, role, schema]
  );
}
