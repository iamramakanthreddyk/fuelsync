// Types handled by TypeScript compilation
// Import custom Express types
import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import prisma from '../utils/prisma';
import { beforeCreateStation, beforeCreatePump, beforeCreateNozzle } from './planEnforcement';
import { getReportTier } from '../config/reportTiers';
import { hasFeatureAccess } from '../config/roleBasedAccess';
import { logPlanViolation } from './activityLogger';

export function checkStationLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
    }
    try {
      await beforeCreateStation(prisma, tenantId);
      next();
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  };
}

export function checkPumpLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as any).user?.tenantId;
    const stationId = req.body.stationId;
    if (!tenantId || !stationId) {
      return res.status(400).json({ status: 'error', message: 'Missing context' });
    }
    try {
      await beforeCreatePump(prisma, tenantId, stationId);
      next();
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  };
}

/**
 * Check feature access based on role and plan
 */
export function checkFeatureAccess(feature: string, action: string = 'view') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.tenantId || !user?.role) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    try {
      // Get tenant's plan
      const tenantResult = await prisma.$queryRaw`
        SELECT plan_id FROM public.tenants WHERE id = ${user.tenantId}
      ` as any[];

      if (tenantResult.length === 0) {
        return res.status(404).json({ status: 'error', message: 'Tenant not found' });
      }

      const planId = tenantResult[0].plan_id;
      const reportTier = getReportTier(planId);

      // Map plan to tier name
      const planTierMap: Record<string, string> = {
        '00000000-0000-0000-0000-000000000001': 'starter',
        '00000000-0000-0000-0000-000000000002': 'pro',
        '00000000-0000-0000-0000-000000000003': 'enterprise'
      };

      const planTier = planTierMap[planId] || 'starter';

      // Check access
      const hasAccess = hasFeatureAccess(planTier as any, user.role as any, feature, action);

      if (!hasAccess) {
        // Log the violation
        if (req.app.locals.db) {
          await logPlanViolation(
            req.app.locals.db,
            user.tenantId,
            user.userId,
            'FEATURE_ACCESS_DENIED',
            {
              feature,
              action,
              userRole: user.role,
              planTier,
              requestPath: req.path,
              requestMethod: req.method
            }
          );
        }

        return res.status(403).json({
          status: 'error',
          message: `Access denied. Feature '${feature}' not available for ${user.role} in ${reportTier.name} plan.`,
          upgradeRequired: planTier === 'starter',
          currentPlan: reportTier.name
        });
      }

      // Add plan info to request for use in controllers
      (req as any).planInfo = {
        planId,
        planTier,
        reportTier,
        userRole: user.role,
        featureAccess: (feature: string, action?: string) => hasFeatureAccess(planTier as any, user.role as any, feature, action || 'view')
      };

      next();
    } catch (err: any) {
      console.error('[FEATURE-ACCESS] Error checking feature access:', err);
      res.status(500).json({ status: 'error', message: 'Error checking feature access' });
    }
  };
}

export function checkNozzleLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as any).user?.tenantId;
    const pumpId = req.body.pumpId;
    if (!tenantId || !pumpId) {
      return res.status(400).json({ status: 'error', message: 'Missing context' });
    }
    try {
      await beforeCreateNozzle(prisma, tenantId, pumpId);
      next();
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  };
}
