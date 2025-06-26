import { pool } from './db-utils';
import bcrypt from 'bcrypt';

export async function createTenant(name = 'test_tenant') {
  const { rows } = await pool.query(`SELECT id FROM public.plans LIMIT 1`);
  const planId = rows[0].id;
  const result = await pool.query(
    `INSERT INTO public.tenants (name, plan_id, status)
     VALUES ($1,$2,'active')
     RETURNING id`,
    [name, planId]
  );
  return result.rows[0].id as string;
}

export async function createUser(tenantId: string, role: string) {
  const hash = await bcrypt.hash('password', 1);
  await pool.query(
    `INSERT INTO public.users (tenant_id, email, password_hash, role)
     VALUES ($1, $2, $3, $4)`,
    [tenantId, `${role}@tenant.com`, hash, role]
  );
}
