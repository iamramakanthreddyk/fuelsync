/**
 * @file middlewares/planEnforcementMiddleware.ts
 * @description Comprehensive plan enforcement middleware for all features
 */
// Types handled by TypeScript compilation
// Import custom Express types
import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { getReportTier, checkDailyReportLimit } from '../config/reportTiers';
import { hasFeatureAccess, getFeatureAccess } from '../config/roleBasedAccess';
import { logPlanViolation } from './activityLogger';

interface PlanEnforcementOptions {
  feature: string;
  action?: string;
  requiresPro?: boolean;
  requiresEnterprise?: boolean;
  customCheck?: (req: Request, planTier: any, userRole: string) => Promise<boolean>;
}

/**
 * Main plan enforcement middleware factory
 */
export function enforcePlanLimits(db: Pool, options: PlanEnforcementOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.tenantId || !user?.userId || !user?.role) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Authentication required' 
      });
    }

    try {
      // Get tenant's plan information
      const tenantResult = await db.query(
        'SELECT plan_id, status FROM public.tenants WHERE id = $1',
        [user.tenantId]
      );
      
      if (tenantResult.rows.length === 0) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Tenant not found' 
        });
      }

      const { plan_id: planId, status: tenantStatus } = tenantResult.rows[0];
      
      // Check if tenant is active
      if (tenantStatus !== 'active') {
        await logPlanViolation(db, user.tenantId, user.userId, 'TENANT_SUSPENDED', {
          tenantStatus,
          feature: options.feature,
          action: options.action
        });
        
        return res.status(403).json({ 
          status: 'error', 
          message: `Account is ${tenantStatus}. Please contact support.`,
          tenantStatus
        });
      }

      // Get plan tier and feature access
      const reportTier = getReportTier(planId);
      const planTierMap: Record<string, string> = {
        '00000000-0000-0000-0000-000000000001': 'starter',
        '00000000-0000-0000-0000-000000000002': 'pro',
        '00000000-0000-0000-0000-000000000003': 'enterprise'
      };
      const planTier = planTierMap[planId] || 'starter';

      // Check basic feature access
      const hasAccess = hasFeatureAccess(
        planTier as any, 
        user.role as any, 
        options.feature, 
        options.action || 'view'
      );

      if (!hasAccess) {
        await logPlanViolation(db, user.tenantId, user.userId, 'FEATURE_ACCESS_DENIED', {
          feature: options.feature,
          action: options.action,
          userRole: user.role,
          planTier,
          requiresPro: options.requiresPro,
          requiresEnterprise: options.requiresEnterprise
        });

        const upgradeMessage = options.requiresEnterprise 
          ? 'This feature requires Enterprise plan'
          : options.requiresPro 
          ? 'This feature requires Pro or Enterprise plan'
          : `Feature not available for ${user.role} in ${reportTier.name} plan`;

        return res.status(403).json({ 
          status: 'error', 
          message: upgradeMessage,
          currentPlan: reportTier.name,
          upgradeRequired: true,
          feature: options.feature
        });
      }

      // Run custom checks if provided
      if (options.customCheck) {
        const customCheckPassed = await options.customCheck(req, reportTier, user.role);
        if (!customCheckPassed) {
          await logPlanViolation(db, user.tenantId, user.userId, 'CUSTOM_LIMIT_EXCEEDED', {
            feature: options.feature,
            action: options.action,
            customCheck: 'failed'
          });

          return res.status(403).json({ 
            status: 'error', 
            message: 'Plan limit exceeded for this operation',
            currentPlan: reportTier.name
          });
        }
      }

      // Add plan context to request
      (req as any).planContext = {
        planName: reportTier.name || 'Regular',
        planTier,
        maxStations: planTier === 'starter' ? 1 : planTier === 'pro' ? 5 : 999,
        userRole: user.role,
        tenantStatus
      };

      next();
    } catch (error) {
      console.error('[PLAN-ENFORCEMENT] Error:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Error checking plan limits' 
      });
    }
  };
}

/**
 * Specific enforcement functions for common features
 */

// Reports enforcement
export function enforceReportsAccess(db: Pool, reportType: string = 'basic') {
  return enforcePlanLimits(db, {
    feature: 'reports',
    action: 'generate',
    requiresPro: true,
    customCheck: async (req, reportTier, userRole) => {
      // Check daily report limits
      const dailyLimit = await checkDailyReportLimit(db, (req as any).user?.tenantId || '', reportTier.planId || '');
      return dailyLimit.allowed;
    }
  });
}

// Station management enforcement
export function enforceStationAccess(db: Pool, action: string = 'view') {
  return enforcePlanLimits(db, {
    feature: 'stations',
    action,
    customCheck: async (req, reportTier, userRole) => {
      if (action === 'create') {
        // Check station limits
        const stationCount = await db.query(
          'SELECT COUNT(*) as count FROM public.stations WHERE tenant_id = $1',
          [(req as any).user!.tenantId]
        );
        const currentCount = parseInt(stationCount.rows[0]?.count || '0');
        return currentCount < reportTier.maxStations;
      }
      return true;
    }
  });
}

// User management enforcement
export function enforceUserAccess(db: Pool, action: string = 'view') {
  return enforcePlanLimits(db, {
    feature: 'users',
    action,
    customCheck: async (req, reportTier, userRole) => {
      // Only owners and managers can manage users in most plans
      if (['create', 'edit', 'delete'].includes(action)) {
        return ['owner', 'manager', 'superadmin'].includes(userRole);
      }
      return true;
    }
  });
}

// Analytics enforcement
export function enforceAnalyticsAccess(db: Pool, advanced: boolean = false) {
  return enforcePlanLimits(db, {
    feature: 'analytics',
    action: advanced ? 'advanced' : 'view',
    requiresEnterprise: advanced,
    requiresPro: !advanced
  });
}

// Creditors enforcement
export function enforceCreditorsAccess(db: Pool, action: string = 'view') {
  return enforcePlanLimits(db, {
    feature: 'creditors',
    action,
    requiresPro: true // Creditors only available in Pro+
  });
}

/**
 * Middleware to check if tenant has exceeded any limits
 */
export function checkOverallLimits(db: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.tenantId) {
      return next();
    }

    try {
      // Check if tenant has been flagged for excessive violations
      const violationCount = await db.query(`
        SELECT COUNT(*) as count 
        FROM public.user_activity_logs 
        WHERE tenant_id = $1 
          AND action = 'PLAN_LIMIT_EXCEEDED' 
          AND created_at >= CURRENT_DATE - INTERVAL '24 hours'
      `, [user.tenantId]);

      const dailyViolations = parseInt(violationCount.rows[0]?.count || '0');
      
      if (dailyViolations > 50) { // Threshold for excessive violations
        await logPlanViolation(db, user.tenantId, user.userId, 'EXCESSIVE_VIOLATIONS', {
          dailyViolations,
          threshold: 50
        });

        return res.status(429).json({ 
          status: 'error', 
          message: 'Too many plan limit violations. Please upgrade your plan or contact support.',
          violationCount: dailyViolations
        });
      }

      next();
    } catch (error) {
      console.error('[OVERALL-LIMITS] Error:', error);
      next(); // Don't block on errors
    }
  };
}

/**
 * Add plan context to all authenticated requests
 */
export function addPlanContext(db: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.tenantId) {
      return next();
    }

    try {
      const tenantResult = await db.query(
        'SELECT plan_id, status FROM public.tenants WHERE id = $1',
        [user.tenantId]
      );
      
      if (tenantResult.rows.length > 0) {
        const { plan_id: planId, status: tenantStatus } = tenantResult.rows[0];
        const reportTier = getReportTier(planId);
        
        const planTierMap: Record<string, string> = {
          '00000000-0000-0000-0000-000000000001': 'starter',
          '00000000-0000-0000-0000-000000000002': 'pro',
          '00000000-0000-0000-0000-000000000003': 'enterprise'
        };
        const planTier = planTierMap[planId] || 'starter';

        (req as any).planContext = {
          planName: reportTier.name || 'Regular',
          planTier,
          maxStations: planTier === 'starter' ? 1 : planTier === 'pro' ? 5 : 999,
          userRole: user.role,
          tenantStatus
        };
      }

      next();
    } catch (error) {
      console.error('[PLAN-CONTEXT] Error:', error);
      next(); // Don't block on errors
    }
  };
}
