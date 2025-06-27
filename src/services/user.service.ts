import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { UserRole } from '../constants/auth';
import { beforeCreateUser } from '../middleware/planEnforcement';

export async function createUser(
  db: Pool,
  tenantId: string,
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<string> {
  const client = await db.connect();
  try {
    await beforeCreateUser(client, tenantId);
    const hash = await bcrypt.hash(password, 10);
    const res = await client.query(
      'INSERT INTO public.users (id, tenant_id, email, password_hash, name, role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [randomUUID(), tenantId, email, hash, name, role]
    );
    return res.rows[0].id;
  } finally {
    client.release();
  }
}

export async function listUsers(db: Pool, tenantId: string) {
  const res = await db.query(
    'SELECT id, email, name, role, created_at FROM public.users WHERE tenant_id = $1 ORDER BY email',
    [tenantId]
  );
  return res.rows;
}
