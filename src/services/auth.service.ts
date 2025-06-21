import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';
import { AuthPayload } from '../types/auth';
import { UserRole } from '../constants/auth';

export async function login(db: Pool, email: string, password: string, tenantId?: string): Promise<string | null> {
  if (tenantId) {
    const res = await db.query(
      `SELECT id, password_hash, role FROM ${tenantId}.users WHERE email = $1`,
      [email]
    );
    const user = res.rows[0];
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return null;
    const payload: AuthPayload = { userId: user.id, tenantId, role: user.role as UserRole };
    return generateToken(payload);
  }

  const res = await db.query(
    'SELECT id, password_hash, role FROM public.admin_users WHERE email = $1',
    [email]
  );
  const user = res.rows[0];
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  const payload: AuthPayload = { userId: user.id, role: user.role as UserRole, tenantId: null };
  return generateToken(payload);
}
