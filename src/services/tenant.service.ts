import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { getTenantSchemas } from '../utils/schemaUtils';

export async function listTenants(db: Pool) {
  const res = await db.query(
    'SELECT id, name, schema_name, plan_id, created_at FROM public.tenants ORDER BY name'
  );
  return res.rows;
}

export async function createTenant(
  db: Pool,
  name: string,
  schemaName: string,
  planName: string,
  ownerEmail?: string,
  ownerPassword?: string
): Promise<string> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const planRes = await client.query('SELECT id FROM public.plans WHERE name=$1', [planName]);
    if (planRes.rows.length === 0) {
      throw new Error('Invalid plan');
    }
    const planId = planRes.rows[0].id;

    const insertRes = await client.query(
      'INSERT INTO public.tenants (name, schema_name, plan_id) VALUES ($1,$2,$3) RETURNING id',
      [name, schemaName, planId]
    );
    const tenantId = insertRes.rows[0].id;

    const template = fs
      .readFileSync(path.join(process.cwd(), 'migrations/tenant_schema_template.sql'), 'utf8')
      .replace(/{{schema_name}}/g, schemaName);
    await client.query(template);

    if (ownerEmail && ownerPassword) {
      const hash = await bcrypt.hash(ownerPassword, 10);
      await client.query(
        `INSERT INTO ${schemaName}.users (id, tenant_id, email, password_hash, role) VALUES (gen_random_uuid(), $1, $2, $3, 'owner')`,
        [tenantId, ownerEmail, hash]
      );
    }

    await client.query('COMMIT');
    return tenantId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getTenantsSummary(db: Pool) {
  const client = await db.connect();
  try {
    const { rows: tenantRows } = await client.query('SELECT COUNT(*) FROM public.tenants');
    const totalTenants = parseInt(tenantRows[0].count, 10);

    const schemas = await getTenantSchemas(client);
    let totalStations = 0;
    let totalUsers = 0;
    for (const schema of schemas) {
      const { rows: sRows } = await client.query(`SELECT COUNT(*) FROM ${schema}.stations`);
      totalStations += parseInt(sRows[0].count, 10);
      const { rows: uRows } = await client.query(`SELECT COUNT(*) FROM ${schema}.users`);
      totalUsers += parseInt(uRows[0].count, 10);
    }

    const { rows: signupRows } = await client.query(
      "SELECT COUNT(*) FROM public.tenants WHERE date_trunc('month', created_at)=date_trunc('month', NOW())"
    );
    const signupsThisMonth = parseInt(signupRows[0].count, 10);

    return {
      totalTenants,
      activeTenants: totalTenants,
      totalStations,
      totalUsers,
      signupsThisMonth
    };
  } finally {
    client.release();
  }
}
