/**
 * @file utils/requestHelpers.ts
 * @description Helper functions for Express request handling with proper typing
 */

import { Request } from 'express';
import { ExtendedUser } from '../types/auth';

/**
 * Get the authenticated user from the request with proper typing
 */
export function getAuthenticatedUser(req: Request): ExtendedUser | undefined {
  return (req as any).user as ExtendedUser | undefined;
}

/**
 * Get the tenant ID from the request
 */
export function getTenantId(req: Request): string | undefined {
  const user = getAuthenticatedUser(req);
  return user?.tenantId || (req as any).tenantId;
}

/**
 * Get plan info from the request
 */
export function getPlanInfo(req: Request): any {
  return (req as any).planInfo;
}

/**
 * Get plan context from the request
 */
export function getPlanContext(req: Request): any {
  return (req as any).planContext;
}

/**
 * Check if request is for attendant data only
 */
export function isAttendantDataOnly(req: Request): boolean {
  return (req as any).attendantDataOnly === true;
}
