// Types handled by TypeScript compilation
import { Request, Response, NextFunction } from 'express';
import { UserRole, TENANT_HEADER } from '../constants/auth';
import { AuthPayload, ExtendedUser } from '../types/auth';
import { getAuthenticatedUser } from '../utils/requestHelpers';

/**
 * Middleware to set tenant schema context from JWT payload
 * SECURITY: Schema name is shared, but role-based access control is enforced by requireRole middleware
 */
export function setTenantContext(req: Request, res: Response, next: NextFunction) {
  // Skip for admin routes
  if (req.path.startsWith('/api/v1/admin')) {
    return next();
  }

  const user = getAuthenticatedUser(req) as AuthPayload | undefined;
  const headerTenant = req.headers[TENANT_HEADER] as string | undefined;

  if (user) {
    if (!user.tenantId && headerTenant) {
      user.tenantId = headerTenant;
    }
    if (user.tenantId) {
      // Convert AuthPayload to ExtendedUser type
      const extendedUser: ExtendedUser = {
        ...user,
        id: user.userId,
        email: '', // Will be populated by other middleware if needed
        tenantId: user.tenantId,
        name: undefined,
        planName: undefined
      };
      (req as any).user = extendedUser;
      return next();
    }
  }

  if (headerTenant) {
    (req as any).tenantId = headerTenant;
    return next();
  }

  return res
    .status(400)
    .json({ status: 'error', code: 'TENANT_REQUIRED', message: 'Missing tenant context' });
}