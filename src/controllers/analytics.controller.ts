import { Request, Response } from 'express';
import { Pool } from 'pg';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { getStationComparison } from '../services/station.service';
// Frontend analytics endpoints handler
import {
  getHourlySales,
  getPeakHours,
  getFuelPerformance,
} from '../services/analytics.service';

export function createAnalyticsHandlers(db: Pool) {
  return {
    getDashboardMetrics: async (_req: Request, res: Response) => {
      try {
        // Get tenant count
        const tenantResult = await db.query('SELECT COUNT(*) FROM public.tenants');
        const tenantCount = parseInt(tenantResult.rows[0].count);
        
        // Get active tenant count
        const activeTenantResult = await db.query("SELECT COUNT(*) FROM public.tenants WHERE status = 'active'");
        const activeTenantCount = parseInt(activeTenantResult.rows[0].count);

        // Signups in current month
        const signupsResult = await db.query(
          `SELECT COUNT(*) FROM public.tenants WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`
        );
        const signupsThisMonth = parseInt(signupsResult.rows[0].count);
        
        // Get plan count
        const planResult = await db.query('SELECT COUNT(*) FROM public.plans');
        const planCount = parseInt(planResult.rows[0].count);
        
        // Get admin user count
        const adminResult = await db.query('SELECT COUNT(*) FROM public.admin_users');
        const adminCount = parseInt(adminResult.rows[0].count);
        
        // Get total users across all tenants
        const userCountResult = await db.query('SELECT COUNT(*) FROM public.users');
        const userCount = parseInt(userCountResult.rows[0].count);
        
        // Get total stations across all tenants
        const stationCountResult = await db.query('SELECT COUNT(*) FROM public.stations');
        const stationCount = parseInt(stationCountResult.rows[0].count);
        
        // Get recent tenants with formatted dates
        const recentTenantsResult = await db.query(`
          SELECT
            id,
            name,
            status,
            created_at,
            TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at_iso
          FROM public.tenants
          ORDER BY created_at DESC
          LIMIT 5
        `);
        
        // Get tenant distribution by plan
        const planDistributionResult = await db.query(`
          SELECT p.name as plan_name, COUNT(t.id) as tenant_count
          FROM public.tenants t
          JOIN public.plans p ON t.plan_id = p.id
          GROUP BY p.name
          ORDER BY tenant_count DESC
        `);

        const tenantsByPlan = planDistributionResult.rows.map(row => ({
          planName: row.plan_name,
          count: parseInt(row.tenant_count),
          percentage: tenantCount > 0 ? parseFloat(((row.tenant_count / tenantCount) * 100).toFixed(2)) : 0
        }));
        
        // Format the response for frontend compatibility
        const formattedTenants = recentTenantsResult.rows.map(tenant => ({
          id: tenant.id,
          name: tenant.name,
          createdAt: tenant.created_at_iso,
          status: tenant.status
        }));

        successResponse(res, {
          totalTenants: tenantCount,
          activeTenants: activeTenantCount,
          totalPlans: planCount,
          totalAdminUsers: adminCount,
          totalUsers: userCount,
          totalStations: stationCount,
          signupsThisMonth,
          recentTenants: formattedTenants,
          tenantsByPlan,
        });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    getTenantAnalytics: async (req: Request, res: Response) => {
      try {
        const tenantId = req.params.id;
        
        // Get tenant details
        const tenantResult = await db.query(`
          SELECT t.id, t.name, t.status, t.created_at, p.name as plan_name
          FROM public.tenants t
          JOIN public.plans p ON t.plan_id = p.id
          WHERE t.id = $1
        `, [tenantId]);
        
        if (tenantResult.rows.length === 0) {
          return errorResponse(res, 404, 'Tenant not found');
        }
        
        const tenant = tenantResult.rows[0];

        const userCountResult = await db.query(
          'SELECT COUNT(*) FROM public.users WHERE tenant_id = $1',
          [tenantId]
        );
        const userCount = parseInt(userCountResult.rows[0].count);

        const stationCountResult = await db.query(
          'SELECT COUNT(*) FROM public.stations WHERE tenant_id = $1',
          [tenantId]
        );
        const stationCount = parseInt(stationCountResult.rows[0].count);

        const pumpCountResult = await db.query(
          'SELECT COUNT(*) FROM public.pumps WHERE tenant_id = $1',
          [tenantId]
        );
        const pumpCount = parseInt(pumpCountResult.rows[0].count);

        const salesResult = await db.query(
          'SELECT COUNT(*), COALESCE(SUM(amount), 0) as total_amount FROM public.sales WHERE tenant_id = $1',
          [tenantId]
        );
        const salesCount = parseInt(salesResult.rows[0].count);
        const totalSales = parseFloat(salesResult.rows[0].total_amount);
        
        // Format tenant date for frontend
        const formattedTenant = {
          ...tenant,
          created_at: new Date(tenant.created_at).toISOString()
        };
        
        successResponse(res, {
          tenant: formattedTenant,
          userCount,
          stationCount,
          pumpCount,
          salesCount,
          totalSales,
          // Add summary for frontend
          summary: {
            users: userCount,
            stations: stationCount,
            pumps: pumpCount,
            sales: salesCount
          }
        });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    stationComparison: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const idsParam = req.query.stationIds as string;
        if (!idsParam) return errorResponse(res, 400, 'stationIds required');
        const stationIds = idsParam.split(',');
        const period = (req.query.period as string) || 'monthly';
        const data = await getStationComparison(db, tenantId, stationIds, period);
        successResponse(res, data);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    hourlySales: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const { stationId, dateFrom, dateTo } = req.query as any;
        if (!stationId || !dateFrom || !dateTo) {
          return errorResponse(res, 400, 'stationId, dateFrom and dateTo required');
        }
        const data = await getHourlySales(
          tenantId,
          stationId,
          new Date(dateFrom),
          new Date(dateTo)
        );
        successResponse(res, data);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    peakHours: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const stationId = req.query.stationId as string;
        if (!stationId) return errorResponse(res, 400, 'stationId required');
        const data = await getPeakHours(tenantId, stationId);
        successResponse(res, data);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    fuelPerformance: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const { stationId, dateFrom, dateTo } = req.query as any;
        if (!stationId || !dateFrom || !dateTo) {
          return errorResponse(res, 400, 'stationId, dateFrom and dateTo required');
        }
        const data = await getFuelPerformance(
          tenantId,
          stationId,
          new Date(dateFrom),
          new Date(dateTo)
        );
        successResponse(res, data);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}