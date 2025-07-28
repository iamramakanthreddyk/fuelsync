export enum UserRole {
  SuperAdmin = 'superadmin',
  Owner = 'owner',
  Manager = 'manager',
  Attendant = 'attendant',
}

export const AUTH_HEADER = 'authorization';
export const TENANT_HEADER = 'x-tenant-id';
// Token expiry can be configured via environment. Default to 1 hour.
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
export const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

// Warn if running in production without a proper secret
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'change_me') {
  // eslint-disable-next-line no-console
  console.warn('[AUTH] JWT_SECRET is using default value in production');
}
export const REFRESH_TOKEN_EXPIRES_IN = '24h';
