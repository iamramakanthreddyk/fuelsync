/**
 * @file types/express.d.ts
 * @description Extended Express types for custom properties
 */

import { ExtendedUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: ExtendedUser;
      tenantId?: string;
      planInfo?: {
        planId: string;
        planTier: string;
        reportTier: any;
        userRole: string;
        featureAccess: (feature: string, action?: string) => boolean;
      };
      planContext?: {
        planName: string;
        planTier: string;
        maxStations: number;
        userRole: string;
        tenantStatus: string;
        featureAccess?: any;
      };
      attendantDataOnly?: boolean;
    }
  }
}

export {};
