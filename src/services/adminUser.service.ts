import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { UserRole } from '../constants/auth';

export async function createAdminUser(
  db: Pool,
  email: string,
  password: string,
  role: UserRole = UserRole.SuperAdmin
): Promise<void> {
  const hash = await bcrypt.hash(password, 10);
  await db.query(
    'INSERT INTO public.admin_users (email, password_hash, role) VALUES ($1, $2, $3)',
    [email, hash, role]
  );
}

export async function listAdminUsers(db: Pool) {
  const res = await db.query(
    'SELECT id, email, role, created_at FROM public.admin_users ORDER BY email'
  );
  return res.rows;
}
