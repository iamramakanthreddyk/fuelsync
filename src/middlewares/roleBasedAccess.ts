/**
 * @file middlewares/roleBasedAccess.ts
 * @description Role-based access control middleware using actual database schema
 */
// Types handled by TypeScript compilation
import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { hasFeatureAccess, getPlanTierFromName } from '../config/roleBasedAccess';

interface RoleAccessOptions {
  feature: string;
  action?: string;
  requiresPro?: boolean;
  requiresEnterprise?: boolean;
}

/**
 * Middleware to enforce role-based access control
 */
export function enforceRoleAccess(db: Pool, options: RoleAccessOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.tenantId || !user?.userId || !user?.role) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    try {
      // Get tenant's plan information from database
      const tenantResult = await db.query(`
        SELECT t.status, p.name as plan_name, p.max_stations
        FROM public.tenants t
        LEFT JOIN public.plans p ON t.plan_id = p.id
        WHERE t.id = $1
      `, [user.tenantId]);
      
      if (tenantResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: 'Tenant not found' 
        });
      }

      const { status: tenantStatus, plan_name: planName, max_stations: maxStations } = tenantResult.rows[0];
      
      // Check if tenant is active
      if (tenantStatus !== 'active') {
        // Log access violation
        await logRoleAccessViolation(db, user.tenantId, user.userId, user.role, 'unknown', 
          options.feature, options.action || 'access', false, `Tenant status: ${tenantStatus}`);
        
        return res.status(403).json({ 
          success: false,
          message: `Account is ${tenantStatus}. Please contact support.`,
          tenantStatus
        });
      }

      // Get plan tier from plan name
      const planTier = getPlanTierFromName(planName || 'Regular');
      
      // Check role-based feature access
      const hasAccess = hasFeatureAccess(
        planTier, 
        user.role as any, 
        options.feature, 
        options.action || 'view'
      );

      if (!hasAccess) {
        // Log access violation
        await logRoleAccessViolation(db, user.tenantId, user.userId, user.role, planTier, 
          options.feature, options.action || 'access', false, 
          `Feature not available for ${user.role} in ${planName} plan`);

        const upgradeMessage = options.requiresEnterprise 
          ? 'This feature requires Enterprise plan'
          : options.requiresPro 
          ? 'This feature requires Pro or Enterprise plan'
          : `Feature not available for ${user.role} in ${planName} plan`;

        return res.status(403).json({ 
          success: false,
          message: upgradeMessage,
          currentPlan: planName,
          planTier,
          upgradeRequired: true,
          feature: options.feature
        });
      }

      // Log successful access
      await logRoleAccessViolation(db, user.tenantId, user.userId, user.role, planTier, 
        options.feature, options.action || 'access', true, null);

      // Add plan context to request for use in controllers
      req.planContext = {
        planName,
        planTier,
        maxStations,
        userRole: user.role,
        tenantStatus
      };

      next();
    } catch (error) {
      console.error('[ROLE-ACCESS] Error checking access:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error checking access permissions' 
      });
    }
  };
}

/**
 * Log role access attempts to database
 */
async function logRoleAccessViolation(
  db: Pool,
  tenantId: string,
  userId: string,
  userRole: string,
  planTier: string,
  feature: string,
  action: string,
  accessGranted: boolean,
  denialReason: string | null
): Promise<void> {
  try {
    await db.query(`
      INSERT INTO public.role_access_log (
        id, tenant_id, user_id, user_role, plan_tier, feature_requested, 
        action_requested, access_granted, denial_reason, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      )
    `, [tenantId, userId, userRole, planTier, feature, action, accessGranted, denialReason]);
  } catch (error) {
    console.error('[ROLE-ACCESS] Error logging access attempt:', error);
  }
}

/**
 * Specific middleware functions for common features
 */

// Reports access (Pro+ only)
export function enforceReportsAccess(db: Pool) {
  return enforceRoleAccess(db, {
    feature: 'reports',
    action: 'view',
    requiresPro: true
  });
}

// Station management (based on role)
export function enforceStationAccess(db: Pool, action: string = 'view') {
  return enforceRoleAccess(db, {
    feature: 'stations',
    action
  });
}

// User management (owners and managers only)
export function enforceUserManagement(db: Pool, action: string = 'view') {
  return enforceRoleAccess(db, {
    feature: 'users',
    action
  });
}

// Creditors access (Pro+ only)
export function enforceCreditorsAccess(db: Pool, action: string = 'view') {
  return enforceRoleAccess(db, {
    feature: 'creditors',
    action,
    requiresPro: true
  });
}

// Analytics access (Pro+ for basic, Enterprise for advanced)
export function enforceAnalyticsAccess(db: Pool, advanced: boolean = false) {
  return enforceRoleAccess(db, {
    feature: 'analytics',
    action: advanced ? 'advanced' : 'view',
    requiresPro: !advanced,
    requiresEnterprise: advanced
  });
}

/**
 * Middleware to add plan context to all authenticated requests
 */
export function addPlanContext(db: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.tenantId) {
      return next();
    }

    try {
      const tenantResult = await db.query(`
        SELECT t.status, p.name as plan_name, p.max_stations
        FROM public.tenants t
        LEFT JOIN public.plans p ON t.plan_id = p.id
        WHERE t.id = $1
      `, [user.tenantId]);
      
      if (tenantResult.rows.length > 0) {
        const { status: tenantStatus, plan_name: planName, max_stations: maxStations } = tenantResult.rows[0];
        const planTier = getPlanTierFromName(planName || 'Regular');

        req.planContext = {
          planName,
          planTier,
          maxStations,
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

/**
 * Check if user can access own data only (for attendants)
 */
export function enforceOwnDataOnly(db: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.role) {
      return next();
    }

    // Only enforce for attendants
    if (user.role === 'attendant') {
      // Add user_id filter to query parameters for attendants
      req.query.user_id = user.userId;
      req.attendantDataOnly = true;
    }

    next();
  };
}
