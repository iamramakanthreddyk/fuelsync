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
  
  // Unified schema uses public namespace; keep property for backward compatibility
  (req as any).schemaName = 'public';
  
  next();
}