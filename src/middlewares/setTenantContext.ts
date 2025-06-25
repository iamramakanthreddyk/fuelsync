import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../constants/auth';

export interface AuthPayload {
  userId: string;
  tenantId: string | null;
  role: UserRole;
}

/**
 * Middleware to set tenant schema context from JWT payload
 * SECURITY: Schema name is shared, but role-based access control is enforced by requireRole middleware
 */
export function setTenantContext(req: Request, res: Response, next: NextFunction) {
  // Skip for admin routes
  if (req.path.startsWith('/api/v1/admin')) {
    return next();
  }
  
  const user = req.user as AuthPayload;
  
  console.log('[SET-TENANT-CONTEXT] User from JWT:', user);
  
  if (user && user.tenantId) {
    // Set schema name from JWT payload (shared by all users in same tenant)
    (req as any).schemaName = user.tenantId;
    console.log('[SET-TENANT-CONTEXT] Set schemaName to:', user.tenantId);
    // Role is available in req.user.role for authorization checks
  } else {
    // Default tenant for non-authenticated requests
    (req as any).schemaName = 'production_tenant';
    console.log('[SET-TENANT-CONTEXT] Set default schemaName to: production_tenant');
  }
  
  next();
}