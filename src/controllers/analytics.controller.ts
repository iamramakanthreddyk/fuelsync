import { Request, Response } from 'express';
import { Pool } from 'pg';
import { errorResponse } from '../utils/errorResponse';

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
        
        // Get plan count
        const planResult = await db.query('SELECT COUNT(*) FROM public.plans');
        const planCount = parseInt(planResult.rows[0].count);
        
        // Get admin user count
        const adminResult = await db.query('SELECT COUNT(*) FROM public.admin_users');
        const adminCount = parseInt(adminResult.rows[0].count);
        
        // Get total users across all tenants
        const userCountResult = await db.query(`
          SELECT COUNT(*) FROM (
            SELECT schema_name FROM information_schema.schemata 
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
          ) schemas, 
          LATERAL (
            SELECT COUNT(*) as user_count 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = schemas.schema_name AND tablename = 'users'
          ) tables
          WHERE tables.user_count > 0
        `);
        const userCount = parseInt(userCountResult.rows[0].count || '0');
        
        // Get total stations across all tenants
        const stationCountResult = await db.query(`
          SELECT COUNT(*) FROM (
            SELECT schema_name FROM information_schema.schemata 
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
          ) schemas, 
          LATERAL (
            SELECT COUNT(*) as station_count 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = schemas.schema_name AND tablename = 'stations'
          ) tables
          WHERE tables.station_count > 0
        `);
        const stationCount = parseInt(stationCountResult.rows[0].count || '0');
        
        // Get recent tenants with formatted dates
        const recentTenantsResult = await db.query(`
          SELECT 
            id, 
            name, 
            schema_name, 
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
        
        // Format the response for frontend compatibility
        const formattedTenants = recentTenantsResult.rows.map(tenant => ({
          ...tenant,
          created_at: tenant.created_at_iso // Use ISO formatted date
        }));
        
        res.json({
          tenantCount,
          activeTenantCount,
          planCount,
          adminCount,
          userCount,
          stationCount,
          recentTenants: formattedTenants,
          planDistribution: planDistributionResult.rows,
          // Add summary for frontend
          summary: {
            tenants: tenantCount,
            users: userCount,
            stations: stationCount
          }
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
          SELECT t.id, t.name, t.schema_name, t.status, t.created_at, p.name as plan_name
          FROM public.tenants t
          JOIN public.plans p ON t.plan_id = p.id
          WHERE t.id = $1
        `, [tenantId]);
        
        if (tenantResult.rows.length === 0) {
          return errorResponse(res, 404, 'Tenant not found');
        }
        
        const tenant = tenantResult.rows[0];
        const schemaName = tenant.schema_name;
        
        // Get user count
        const userCountResult = await db.query(`
          SELECT COUNT(*) FROM ${schemaName}.users
        `);
        const userCount = parseInt(userCountResult.rows[0].count);
        
        // Get station count
        const stationCountResult = await db.query(`
          SELECT COUNT(*) FROM ${schemaName}.stations
        `);
        const stationCount = parseInt(stationCountResult.rows[0].count);
        
        // Get pump count
        const pumpCountResult = await db.query(`
          SELECT COUNT(*) FROM ${schemaName}.pumps
        `);
        const pumpCount = parseInt(pumpCountResult.rows[0].count);
        
        // Get sales count
        let salesCount = 0;
        let totalSales = 0;
        try {
          const salesResult = await db.query(`
            SELECT COUNT(*), COALESCE(SUM(amount), 0) as total_amount FROM ${schemaName}.sales
          `);
          salesCount = parseInt(salesResult.rows[0].count);
          totalSales = parseFloat(salesResult.rows[0].total_amount);
        } catch (e) {
          // Table might not exist
          console.log('Sales table not found for tenant:', schemaName);
        }
        
        // Format tenant date for frontend
        const formattedTenant = {
          ...tenant,
          created_at: new Date(tenant.created_at).toISOString()
        };
        
        res.json({
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
    }
  };
}