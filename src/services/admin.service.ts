import { Pool } from 'pg';
import bcrypt from 'bcrypt';

export interface AdminUserInput {
  email: string;
  password?: string;
  role?: string;
}

export interface AdminUserOutput {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
}

/**
 * Create a new admin user
 */
export async function createAdminUser(db: Pool, input: AdminUserInput): Promise<AdminUserOutput> {
  // Check if email already exists
  const existingUser = await db.query(
    'SELECT id FROM public.admin_users WHERE email = $1',
    [input.email]
  );
  
  if (existingUser.rows.length > 0) {
    throw new Error('Email already in use');
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(input.password || 'admin123', 10);
  
  const result = await db.query(
    'INSERT INTO public.admin_users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
    [input.email, passwordHash, input.role || 'superadmin']
  );
  
  const user = result.rows[0];
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  };
}

/**
 * List all admin users
 */
export async function listAdminUsers(db: Pool): Promise<AdminUserOutput[]> {
  const result = await db.query(
    'SELECT id, email, role, created_at FROM public.admin_users ORDER BY created_at DESC'
  );
  
  return result.rows.map(user => ({
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  }));
}

/**
 * Get admin user by ID
 */
export async function getAdminUser(db: Pool, id: string): Promise<AdminUserOutput | null> {
  const result = await db.query(
    'SELECT id, email, role, created_at FROM public.admin_users WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const user = result.rows[0];
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  };
}

/**
 * Update admin user
 */
export async function updateAdminUser(db: Pool, id: string, input: AdminUserInput): Promise<AdminUserOutput> {
  let query = 'UPDATE public.admin_users SET ';
  const params: any[] = [];
  const updates: string[] = [];
  
  if (input.email) {
    params.push(input.email);
    updates.push(`email = $${params.length}`);
  }
  
  if (input.password) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    params.push(passwordHash);
    updates.push(`password_hash = $${params.length}`);
  }
  
  if (input.role) {
    params.push(input.role);
    updates.push(`role = $${params.length}`);
  }
  
  if (updates.length === 0) {
    throw new Error('No updates provided');
  }
  
  params.push(id);
  query += updates.join(', ') + ` WHERE id = $${params.length} RETURNING id, email, role, created_at`;
  
  const result = await db.query(query, params);
  
  if (result.rows.length === 0) {
    throw new Error('Admin user not found');
  }
  
  const user = result.rows[0];
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  };
}

/**
 * Delete admin user
 */
export async function deleteAdminUser(db: Pool, id: string): Promise<void> {
  // Check if this is the last admin user
  const countResult = await db.query('SELECT COUNT(*) FROM public.admin_users');
  if (parseInt(countResult.rows[0].count) <= 1) {
    throw new Error('Cannot delete the last admin user');
  }
  
  await db.query('DELETE FROM public.admin_users WHERE id = $1', [id]);
}

/**
 * Reset admin user password
 */
export async function resetAdminPassword(db: Pool, id: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  const result = await db.query(
    'UPDATE public.admin_users SET password_hash = $1 WHERE id = $2',
    [passwordHash, id]
  );
  
  if (result.rowCount === 0) {
    throw new Error('Admin user not found');
  }
}