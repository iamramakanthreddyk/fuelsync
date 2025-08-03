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

// Helper functions for time calculations
function getTimeAgo(date: Date | string | null): string {
  if (!date) return 'Unknown';

  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
}

function isToday(date: Date | string | null): boolean {
  if (!date) return false;
  const today = new Date();
  const checkDate = new Date(date);
  return today.toDateString() === checkDate.toDateString();
}

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
            (SELECT COUNT(*) FROM public.stations WHERE tenant_id = t.id::text) as current_stations,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id::text) as total_users,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id::text AND role = 'owner') as owners,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id::text AND role = 'manager') as managers,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id::text AND role = 'attendant') as attendants,
            0 as today_reports,
            0 as month_reports,
            (SELECT MAX(updated_at) FROM public.users WHERE tenant_id = t.id::text) as last_activity
          FROM public.tenants t
          LEFT JOIN public.plans p ON t.plan_id = p.id
          ORDER BY t.created_at DESC
        `;
        
        const result = await db.query(query);
        
        const tenants = result.rows.map(row => {
          console.log('[SUPERADMIN-CONTROLLER] Raw row data:', {
            id: row.id,
            name: row.name,
            created_at: row.created_at,
            created_at_type: typeof row.created_at,
            last_activity: row.last_activity,
            last_activity_type: typeof row.last_activity
          });

          const tenant = {
            id: row.id,
            name: row.name,
            status: row.status,
            createdAt: row.created_at ? row.created_at.toISOString() : null,
            plan: {
              id: row.plan_id,
              name: row.plan_name,
              maxStations: row.max_stations,
              priceMonthly: Math.round(parseFloat(row.price_monthly || 0) * 100) / 100
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
            lastActivity: row.last_activity ? row.last_activity.toISOString() : null,
            planLimits: row.plan_id ? getReportTierSummary(row.plan_id) : null
          };

          console.log('[SUPERADMIN-CONTROLLER] Mapped tenant:', tenant);
          return tenant;
        });
        
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
          priceMonthly: Math.round(parseFloat(row.price_monthly) * 100) / 100, // Round to 2 decimal places
          priceYearly: Math.round(parseFloat(row.price_yearly) * 100) / 100,   // Round to 2 decimal places
          features: row.features,
          createdAt: row.created_at ? row.created_at.toISOString() : null,
          tenantCount: parseInt(row.tenant_count),
          reportTier: getReportTierSummary(row.id)
        }));
        
        successResponse(res, { plans });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    // Create a new plan
    createPlan: async (req: Request, res: Response) => {
      try {
        const { name, maxStations, maxPumpsPerStation, maxNozzlesPerPump, priceMonthly, priceYearly, features } = req.body;

        if (!name || !maxStations || !priceMonthly) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields: name, maxStations, priceMonthly'
          });
        }

        const query = `
          INSERT INTO public.plans (id, name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, price_yearly, features, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING *
        `;

        const result = await db.query(query, [
          name,
          maxStations,
          maxPumpsPerStation || 10,
          maxNozzlesPerPump || 4,
          priceMonthly,
          priceYearly || priceMonthly * 10,
          JSON.stringify(features || [])
        ]);

        return res.json({
          success: true,
          data: { plan: result.rows[0] },
          message: 'Plan created successfully'
        });
      } catch (error) {
        console.error('[SUPERADMIN-CONTROLLER] Error creating plan:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create plan'
        });
      }
    },

    // Update an existing plan
    updatePlan: async (req: Request, res: Response) => {
      try {
        const { planId } = req.params;
        const { name, maxStations, maxPumpsPerStation, maxNozzlesPerPump, priceMonthly, priceYearly, features } = req.body;

        const query = `
          UPDATE public.plans
          SET name = $1, max_stations = $2, max_pumps_per_station = $3, max_nozzles_per_pump = $4,
              price_monthly = $5, price_yearly = $6, features = $7, updated_at = NOW()
          WHERE id = $8
          RETURNING *
        `;

        const result = await db.query(query, [
          name,
          maxStations,
          maxPumpsPerStation,
          maxNozzlesPerPump,
          priceMonthly,
          priceYearly,
          JSON.stringify(features || []),
          planId
        ]);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Plan not found'
          });
        }

        const updatedPlan = {
          ...result.rows[0],
          priceMonthly: Math.round(parseFloat(result.rows[0].price_monthly) * 100) / 100,
          priceYearly: Math.round(parseFloat(result.rows[0].price_yearly) * 100) / 100
        };

        return res.json({
          success: true,
          data: { plan: updatedPlan },
          message: 'Plan updated successfully'
        });
      } catch (error) {
        console.error('[SUPERADMIN-CONTROLLER] Error updating plan:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update plan'
        });
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

    // Get all users across all tenants
    getAllUsers: async (req: Request, res: Response) => {
      try {
        const query = `
          SELECT
            u.id,
            u.email,
            u.role,
            u.created_at,
            u.updated_at,
            t.name as tenant_name,
            t.id as tenant_id,
            t.status as tenant_status
          FROM public.users u
          LEFT JOIN public.tenants t ON u.tenant_id = t.id
          ORDER BY u.created_at DESC
        `;

        const result = await db.query(query);

        const users = result.rows.map(row => ({
          id: row.id,
          email: row.email,
          role: row.role,
          createdAt: row.created_at ? row.created_at.toISOString() : null,
          updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
          tenant: row.tenant_id ? {
            id: row.tenant_id,
            name: row.tenant_name,
            status: row.tenant_status
          } : null
        }));

        // Also get SuperAdmin users
        const adminQuery = `
          SELECT id, email, role, created_at
          FROM public.admin_users
          ORDER BY created_at DESC
        `;

        const adminResult = await db.query(adminQuery);
        const adminUsers = adminResult.rows.map(row => ({
          id: row.id,
          email: row.email,
          role: row.role,
          createdAt: row.created_at ? row.created_at.toISOString() : null,
          updatedAt: null,
          tenant: null
        }));

        return res.json({
          success: true,
          data: {
            tenantUsers: users,
            adminUsers: adminUsers,
            totalUsers: users.length + adminUsers.length
          }
        });
      } catch (error) {
        console.error('[SUPERADMIN-CONTROLLER] Error getting all users:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch users'
        });
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
            COUNT(DISTINCT CASE WHEN t.status = 'active' THEN t.id END) as active_tenants,
            COUNT(DISTINCT u.id) as total_users,
            COUNT(DISTINCT CASE WHEN u.updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN u.id END) as active_users_week,
            COUNT(DISTINCT s.id) as total_stations,
            COUNT(DISTINCT p.id) as total_pumps,
            COUNT(DISTINCT n.id) as total_nozzles,
            0 as reports_today,
            0 as reports_month
          FROM public.tenants t
          LEFT JOIN public.users u ON t.id::text = u.tenant_id
          LEFT JOIN public.stations s ON t.id::text = s.tenant_id
          LEFT JOIN public.pumps p ON s.id::text = p.station_id
          LEFT JOIN public.nozzles n ON p.id::text = n.pump_id
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

        // Get real recent activities
        const recentActivitiesQuery = `
          SELECT
            'user_login' as type,
            CONCAT('User logged in: ', u.email) as description,
            u.last_login_at as created_at,
            t.name as tenant_name
          FROM public.users u
          LEFT JOIN public.tenants t ON u.tenant_id = t.id
          WHERE u.last_login_at >= NOW() - INTERVAL '7 days'

          UNION ALL

          SELECT
            'tenant_created' as type,
            CONCAT('New tenant registered: ', name) as description,
            created_at,
            name as tenant_name
          FROM public.tenants
          WHERE created_at >= NOW() - INTERVAL '30 days'

          ORDER BY created_at DESC
          LIMIT 10
        `;

        const recentActivitiesResult = await db.query(recentActivitiesQuery);
        const recentActivities = recentActivitiesResult.rows.map(row => ({
          type: row.type,
          description: row.description,
          createdAt: row.created_at ? row.created_at.toISOString() : null,
          tenantName: row.tenant_name,
          timeAgo: getTimeAgo(row.created_at)
        }));

        // Real activity summary
        const activitySummary = {
          totalActivities: recentActivities.length,
          todayActivities: recentActivities.filter(a => isToday(a.createdAt)).length,
          weekActivities: recentActivities.length,
          monthActivities: recentActivities.length,
          topActions: ['user_login', 'tenant_created'],
          activeUsers: parseInt(systemStats.rows[0]?.active_users_week || '0'),
          recentActivities
        };

        // Simplified suspicious activities (placeholder for future implementation)
        const suspiciousActivities: any[] = [];

        // Simplified violations (without activity logs dependency)
        const violations = { rows: [] as any[] };

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
          planViolations: violations.rows.map((row: any) => ({
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
            (SELECT COUNT(*) FROM public.stations WHERE tenant_id = t.id::text) as current_stations,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id::text) as total_users,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id::text AND last_login_at >= CURRENT_DATE - INTERVAL '7 days') as active_users,
            0 as reports_today,
            0 as reports_month,
            0 as activities_today
          FROM public.tenants t
          LEFT JOIN public.plans p ON t.plan_id = p.id
          WHERE t.id = $1
        `;

        const tenantResult = await db.query(tenantQuery, [tenantId]);

        if (tenantResult.rows.length === 0) {
          return errorResponse(res, 404, 'Tenant not found');
        }

        const tenant = tenantResult.rows[0];

        // Get recent activities for this tenant (simplified)
        const activities: any[] = [];

        // Get user breakdown
        const userBreakdownQuery = `
          SELECT
            role,
            COUNT(*) as count,
            COUNT(*) FILTER (WHERE last_login_at >= CURRENT_DATE - INTERVAL '7 days') as active_count
          FROM public.users
          WHERE tenant_id = $1::text
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
    },

    // Get plan comparison for upgrade recommendations
    getPlanComparison: async (req: Request, res: Response) => {
      try {
        const plansQuery = `
          SELECT
            p.id,
            p.name,
            p.max_stations,
            p.max_pumps_per_station,
            p.max_nozzles_per_pump,
            p.price_monthly,
            p.price_yearly,
            p.features,
            COUNT(t.id) as tenant_count,
            COALESCE(SUM(p.price_monthly), 0) as total_monthly_revenue
          FROM public.plans p
          LEFT JOIN public.tenants t ON t.plan_id = p.id
          GROUP BY p.id, p.name, p.max_stations, p.max_pumps_per_station,
                   p.max_nozzles_per_pump, p.price_monthly, p.price_yearly, p.features
          ORDER BY p.price_monthly ASC
        `;

        const plansResult = await db.query(plansQuery);
        const plans = plansResult.rows.map(plan => ({
          id: plan.id,
          name: plan.name,
          maxStations: plan.max_stations,
          maxPumpsPerStation: plan.max_pumps_per_station,
          maxNozzlesPerPump: plan.max_nozzles_per_pump,
          priceMonthly: Math.round(parseFloat(plan.price_monthly) * 100) / 100,
          priceYearly: Math.round(parseFloat(plan.price_yearly) * 100) / 100,
          features: plan.features || [],
          tenantCount: parseInt(plan.tenant_count),
          monthlyRevenue: Math.round(parseFloat(plan.total_monthly_revenue) * 100) / 100,

          // Calculate value metrics
          stationCostPerMonth: plan.max_stations > 0 ?
            Math.round((parseFloat(plan.price_monthly) / plan.max_stations) * 100) / 100 : 0,

          // Feature categories
          featureCategories: {
            reporting: (plan.features || []).filter((f: string) =>
              f.toLowerCase().includes('report') || f.toLowerCase().includes('analytics')
            ).length,
            management: (plan.features || []).filter((f: string) =>
              f.toLowerCase().includes('management') || f.toLowerCase().includes('admin')
            ).length,
            automation: (plan.features || []).filter((f: string) =>
              f.toLowerCase().includes('auto') || f.toLowerCase().includes('alert')
            ).length,
            integration: (plan.features || []).filter((f: string) =>
              f.toLowerCase().includes('api') || f.toLowerCase().includes('integration')
            ).length
          }
        }));

        // Calculate upgrade paths
        const upgradeMatrix = plans.map(plan => ({
          ...plan,
          upgradeOptions: plans.filter(otherPlan =>
            otherPlan.priceMonthly > plan.priceMonthly &&
            otherPlan.maxStations >= plan.maxStations
          ).slice(0, 2) // Show top 2 upgrade options
        }));

        successResponse(res, {
          plans: upgradeMatrix,
          totalPlans: plans.length,
          priceRange: {
            min: Math.min(...plans.map(p => p.priceMonthly)),
            max: Math.max(...plans.map(p => p.priceMonthly))
          },
          featureComparison: {
            maxFeatures: Math.max(...plans.map(p => p.features.length)),
            commonFeatures: plans.length > 0 ?
              plans[0].features.filter((feature: string) =>
                plans.every(plan => plan.features.includes(feature))
              ) : []
          }
        });

      } catch (err: any) {
        console.error('[SUPERADMIN-CONTROLLER] Error getting plan comparison:', err);
        return errorResponse(res, 500, 'Failed to get plan comparison');
      }
    }
  };
}
