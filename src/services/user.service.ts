import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { UserRole } from '../constants/auth';
import { beforeCreateUser } from '../middleware/planEnforcement';

export async function createUser(
  db: Pool,
  schemaName: string,
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<string> {
  const client = await db.connect();
  try {
    // Get actual tenant UUID from schema name
    const tenantRes = await client.query(
      'SELECT id FROM public.tenants WHERE schema_name = $1',
      [schemaName]
    );
    
    if (tenantRes.rows.length === 0) {
      throw new Error(`Tenant not found for schema: ${schemaName}`);
    }
    
    const tenantId = tenantRes.rows[0].id;
    
    await beforeCreateUser(client, tenantId);
    const hash = await bcrypt.hash(password, 10);
    const res = await client.query(
      `INSERT INTO ${schemaName}.users (tenant_id, email, password_hash, name, role) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [tenantId, email, hash, name, role]
    );
    return res.rows[0].id;
  } finally {
    client.release();
  }
}

export async function listUsers(db: Pool, schemaName: string) {
  const res = await db.query(
    `SELECT id, email, name, role, created_at FROM ${schemaName}.users ORDER BY email`
  );
  return res.rows;
}
