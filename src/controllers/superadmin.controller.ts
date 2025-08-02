/**
 * @file controllers/superadmin.controller.ts
 * @description SuperAdmin dashboard and management controllers
 */
// Types handled by TypeScript compilation
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { successResponse, errorResponse } from '../utils/response';
import { getReportTier, getReportTierSummary } from '../config/reportTiers';
import { getPlanRules } from '../config/planConfig';
import { getActivitySummary, getRecentActivities, getSuspiciousActivities } from '../services/activityTracking.service';

export function createSuperAdminHandlers(db: Pool) {
  return {
    // Get all tenants with their plans and usage
    getAllTenants: async (req: Request, res: Response) => {
      try {
        const query = `
          SELECT 
            t.id,
            t.name,
            t.status,
            t.created_at,
            p.name as plan_name,
            p.id as plan_id,
            p.max_stations,
            p.price_monthly,
            (SELECT COUNT(*) FROM public.stations WHERE tenant_id = t.id) as current_stations,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id) as total_users,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id AND role = 'owner') as owners,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id AND role = 'manager') as managers,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id AND role = 'attendant') as attendants,
            (SELECT COUNT(*) FROM public.report_generations WHERE tenant_id = t.id AND DATE(created_at) = CURRENT_DATE) as today_reports,
            (SELECT COUNT(*) FROM public.report_generations WHERE tenant_id = t.id AND created_at >= CURRENT_DATE - INTERVAL '30 days') as month_reports,
            (SELECT MAX(last_login_at) FROM public.users WHERE tenant_id = t.id) as last_activity
          FROM public.tenants t
          LEFT JOIN public.plans p ON t.plan_id = p.id
          ORDER BY t.created_at DESC
        `;
        
        const result = await db.query(query);
        
        const tenants = result.rows.map(row => ({
          id: row.id,
          name: row.name,
          status: row.status,
          createdAt: row.created_at,
          plan: {
            id: row.plan_id,
            name: row.plan_name,
            maxStations: row.max_stations,
            priceMonthly: parseFloat(row.price_monthly || 0)
          },
          usage: {
            currentStations: parseInt(row.current_stations),
            totalUsers: parseInt(row.total_users),
            userBreakdown: {
              owners: parseInt(row.owners),
              managers: parseInt(row.managers),
              attendants: parseInt(row.attendants)
            },
            reports: {
              today: parseInt(row.today_reports),
              thisMonth: parseInt(row.month_reports)
            }
          },
          lastActivity: row.last_activity,
          planLimits: row.plan_id ? getReportTierSummary(row.plan_id) : null
        }));
        
        successResponse(res, { tenants });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    // Assign/Change plan for a tenant
    assignPlan: async (req: Request, res: Response) => {
      try {
        const { tenantId, planId, reason } = req.body;
        const superAdminId = req.user?.userId;
        
        if (!tenantId || !planId) {
          return errorResponse(res, 400, 'Tenant ID and Plan ID are required');
        }
        
        // Verify tenant exists
        const tenantCheck = await db.query('SELECT name FROM public.tenants WHERE id = $1', [tenantId]);
        if (tenantCheck.rows.length === 0) {
          return errorResponse(res, 404, 'Tenant not found');
        }
        
        // Verify plan exists
        const planCheck = await db.query('SELECT name FROM public.plans WHERE id = $1', [planId]);
        if (planCheck.rows.length === 0) {
          return errorResponse(res, 404, 'Plan not found');
        }
        
        // Update tenant plan
        await db.query(
          'UPDATE public.tenants SET plan_id = $1, updated_at = NOW() WHERE id = $2',
          [planId, tenantId]
        );
        
        // Log the plan change
        await db.query(`
          INSERT INTO public.audit_logs (
            tenant_id, user_id, action, details, created_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [
          tenantId,
          superAdminId,
          'PLAN_CHANGED',
          JSON.stringify({
            newPlanId: planId,
            newPlanName: planCheck.rows[0].name,
            reason: reason || 'Changed by SuperAdmin',
            changedBy: 'superadmin'
          })
        ]);
        
        successResponse(res, {
          message: `Plan assigned successfully to ${tenantCheck.rows[0].name}`,
          tenantName: tenantCheck.rows[0].name,
          planName: planCheck.rows[0].name
        });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    // Get all available plans
    getPlans: async (req: Request, res: Response) => {
      try {
        const result = await db.query(`
          SELECT 
            id, name, max_stations, max_pumps_per_station, max_nozzles_per_pump,
            price_monthly, price_yearly, features, created_at,
            (SELECT COUNT(*) FROM public.tenants WHERE plan_id = p.id) as tenant_count
          FROM public.plans p
          ORDER BY price_monthly ASC
        `);
        
        const plans = result.rows.map(row => ({
          id: row.id,
          name: row.name,
          maxStations: row.max_stations,
          maxPumpsPerStation: row.max_pumps_per_station,
          maxNozzlesPerPump: row.max_nozzles_per_pump,
          priceMonthly: parseFloat(row.price_monthly),
          priceYearly: parseFloat(row.price_yearly),
          features: row.features,
          createdAt: row.created_at,
          tenantCount: parseInt(row.tenant_count),
          reportTier: getReportTierSummary(row.id)
        }));
        
        successResponse(res, { plans });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    // Enable/Disable tenant
    toggleTenantStatus: async (req: Request, res: Response) => {
      try {
        const { tenantId } = req.params;
        const { status, reason } = req.body; // 'active', 'suspended', 'cancelled'
        const superAdminId = req.user?.userId;
        
        if (!['active', 'suspended', 'cancelled'].includes(status)) {
          return errorResponse(res, 400, 'Invalid status. Must be: active, suspended, or cancelled');
        }
        
        const result = await db.query(
          'UPDATE public.tenants SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING name',
          [status, tenantId]
        );
        
        if (result.rows.length === 0) {
          return errorResponse(res, 404, 'Tenant not found');
        }
        
        // Log the status change
        await db.query(`
          INSERT INTO public.audit_logs (
            tenant_id, user_id, action, details, created_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [
          tenantId,
          superAdminId,
          'TENANT_STATUS_CHANGED',
          JSON.stringify({
            newStatus: status,
            reason: reason || 'Changed by SuperAdmin',
            changedBy: 'superadmin'
          })
        ]);
        
        successResponse(res, {
          message: `Tenant ${result.rows[0].name} status changed to ${status}`,
          tenantName: result.rows[0].name,
          newStatus: status
        });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    // Reset user password (SuperAdmin only)
    resetUserPassword: async (req: Request, res: Response) => {
      try {
        const { userId, newPassword } = req.body;
        const superAdminId = req.user?.userId;
        
        if (!userId || !newPassword) {
          return errorResponse(res, 400, 'User ID and new password are required');
        }
        
        if (newPassword.length < 6) {
          return errorResponse(res, 400, 'Password must be at least 6 characters');
        }
        
        // Hash password (you should use bcrypt in production)
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const result = await db.query(
          'UPDATE public.users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING name, email, tenant_id',
          [hashedPassword, userId]
        );
        
        if (result.rows.length === 0) {
          return errorResponse(res, 404, 'User not found');
        }
        
        const user = result.rows[0];
        
        // Log the password reset
        await db.query(`
          INSERT INTO public.audit_logs (
            tenant_id, user_id, action, details, created_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [
          user.tenant_id,
          superAdminId,
          'PASSWORD_RESET_BY_ADMIN',
          JSON.stringify({
            targetUserId: userId,
            targetUserName: user.name,
            targetUserEmail: user.email,
            resetBy: 'superadmin'
          })
        ]);
        
        successResponse(res, {
          message: `Password reset successfully for ${user.name}`,
          userName: user.name,
          userEmail: user.email
        });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    // Get usage analytics dashboard
    getUsageAnalytics: async (req: Request, res: Response) => {
      try {
        // Get overall system stats
        const systemStatsQuery = `
          SELECT
            COUNT(DISTINCT t.id) as total_tenants,
            COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') as active_tenants,
            COUNT(DISTINCT u.id) as total_users,
            COUNT(DISTINCT u.id) FILTER (WHERE u.last_login_at >= CURRENT_DATE - INTERVAL '7 days') as active_users_week,
            COUNT(DISTINCT s.id) as total_stations,
            COUNT(DISTINCT p.id) as total_pumps,
            COUNT(DISTINCT n.id) as total_nozzles,
            COUNT(rg.id) FILTER (WHERE DATE(rg.created_at) = CURRENT_DATE) as reports_today,
            COUNT(rg.id) FILTER (WHERE rg.created_at >= CURRENT_DATE - INTERVAL '30 days') as reports_month
          FROM public.tenants t
          LEFT JOIN public.users u ON t.id = u.tenant_id
          LEFT JOIN public.stations s ON t.id = s.tenant_id
          LEFT JOIN public.pumps p ON s.id = p.station_id
          LEFT JOIN public.nozzles n ON p.id = n.pump_id
          LEFT JOIN public.report_generations rg ON t.id = rg.tenant_id
        `;

        const systemStats = await db.query(systemStatsQuery);

        // Get plan distribution
        const planDistributionQuery = `
          SELECT
            p.name as plan_name,
            COUNT(t.id) as tenant_count,
            SUM(p.price_monthly) as monthly_revenue
          FROM public.plans p
          LEFT JOIN public.tenants t ON p.id = t.plan_id AND t.status = 'active'
          GROUP BY p.id, p.name, p.price_monthly
          ORDER BY tenant_count DESC
        `;

        const planDistribution = await db.query(planDistributionQuery);

        // Get activity summary
        const activitySummary = await getActivitySummary(db);

        // Get recent activities
        const recentActivities = await getRecentActivities(db, 20);

        // Get suspicious activities
        const suspiciousActivities = await getSuspiciousActivities(db);

        // Get plan limit violations
        const violationsQuery = `
          SELECT
            t.name as tenant_name,
            p.name as plan_name,
            COUNT(*) as violation_count,
            MAX(ual.created_at) as last_violation
          FROM public.user_activity_logs ual
          JOIN public.tenants t ON ual.tenant_id = t.id
          LEFT JOIN public.plans p ON t.plan_id = p.id
          WHERE ual.action = 'PLAN_LIMIT_EXCEEDED'
            AND ual.created_at >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY t.id, t.name, p.name
          ORDER BY violation_count DESC
          LIMIT 10
        `;

        const violations = await db.query(violationsQuery);

        successResponse(res, {
          systemStats: {
            totalTenants: parseInt(systemStats.rows[0]?.total_tenants || '0'),
            activeTenants: parseInt(systemStats.rows[0]?.active_tenants || '0'),
            totalUsers: parseInt(systemStats.rows[0]?.total_users || '0'),
            activeUsersWeek: parseInt(systemStats.rows[0]?.active_users_week || '0'),
            totalStations: parseInt(systemStats.rows[0]?.total_stations || '0'),
            totalPumps: parseInt(systemStats.rows[0]?.total_pumps || '0'),
            totalNozzles: parseInt(systemStats.rows[0]?.total_nozzles || '0'),
            reportsToday: parseInt(systemStats.rows[0]?.reports_today || '0'),
            reportsMonth: parseInt(systemStats.rows[0]?.reports_month || '0')
          },
          planDistribution: planDistribution.rows.map(row => ({
            planName: row.plan_name,
            tenantCount: parseInt(row.tenant_count),
            monthlyRevenue: parseFloat(row.monthly_revenue || '0')
          })),
          activitySummary,
          recentActivities: recentActivities.slice(0, 10),
          suspiciousActivities: suspiciousActivities.slice(0, 10),
          planViolations: violations.rows.map(row => ({
            tenantName: row.tenant_name,
            planName: row.plan_name,
            violationCount: parseInt(row.violation_count),
            lastViolation: row.last_violation
          }))
        });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    // Get detailed tenant analytics
    getTenantAnalytics: async (req: Request, res: Response) => {
      try {
        const { tenantId } = req.params;

        // Get tenant details with usage
        const tenantQuery = `
          SELECT
            t.id,
            t.name,
            t.status,
            t.created_at,
            p.name as plan_name,
            p.max_stations,
            (SELECT COUNT(*) FROM public.stations WHERE tenant_id = t.id) as current_stations,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id) as total_users,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id AND last_login_at >= CURRENT_DATE - INTERVAL '7 days') as active_users,
            (SELECT COUNT(*) FROM public.report_generations WHERE tenant_id = t.id AND DATE(created_at) = CURRENT_DATE) as reports_today,
            (SELECT COUNT(*) FROM public.report_generations WHERE tenant_id = t.id AND created_at >= CURRENT_DATE - INTERVAL '30 days') as reports_month,
            (SELECT COUNT(*) FROM public.user_activity_logs WHERE tenant_id = t.id AND created_at >= CURRENT_DATE - INTERVAL '24 hours') as activities_today
          FROM public.tenants t
          LEFT JOIN public.plans p ON t.plan_id = p.id
          WHERE t.id = $1
        `;

        const tenantResult = await db.query(tenantQuery, [tenantId]);

        if (tenantResult.rows.length === 0) {
          return errorResponse(res, 404, 'Tenant not found');
        }

        const tenant = tenantResult.rows[0];

        // Get recent activities for this tenant
        const activities = await getRecentActivities(db, 50, tenantId);

        // Get user breakdown
        const userBreakdownQuery = `
          SELECT
            role,
            COUNT(*) as count,
            COUNT(*) FILTER (WHERE last_login_at >= CURRENT_DATE - INTERVAL '7 days') as active_count
          FROM public.users
          WHERE tenant_id = $1
          GROUP BY role
        `;

        const userBreakdown = await db.query(userBreakdownQuery, [tenantId]);

        // Get plan tier info
        const planTier = getReportTierSummary(tenant.plan_id);

        successResponse(res, {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            status: tenant.status,
            createdAt: tenant.created_at,
            planName: tenant.plan_name,
            maxStations: tenant.max_stations,
            currentStations: parseInt(tenant.current_stations),
            totalUsers: parseInt(tenant.total_users),
            activeUsers: parseInt(tenant.active_users),
            reportsToday: parseInt(tenant.reports_today),
            reportsMonth: parseInt(tenant.reports_month),
            activitiesToday: parseInt(tenant.activities_today),
            planTier
          },
          userBreakdown: userBreakdown.rows.map(row => ({
            role: row.role,
            count: parseInt(row.count),
            activeCount: parseInt(row.active_count)
          })),
          recentActivities: activities
        });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}
