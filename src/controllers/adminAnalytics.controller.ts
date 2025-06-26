import { Request, Response } from 'express';
import { Pool } from 'pg';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { getSafeSchema } from '../utils/schemaUtils';

export function createAdminAnalyticsHandlers(db: Pool) {
  return {
    getAnalytics: async (_req: Request, res: Response) => {
      try {
        const tenantsRes = await db.query('SELECT id, schema_name, status, name FROM public.tenants');
        const totalTenants = tenantsRes.rowCount;
        const activeTenants = tenantsRes.rows.filter(t => t.status === 'active').length;
        let totalStations = 0;
        let salesVolume = 0;
        let totalRevenue = 0;
        for (const t of tenantsRes.rows) {
          const schema = getSafeSchema(t.schema_name);
          const stationRes = await db.query(`SELECT COUNT(*) FROM ${schema}.stations`);
          totalStations += parseInt(stationRes.rows[0].count);
          const salesRes = await db.query(`SELECT COALESCE(SUM(volume_sold),0) as volume, COALESCE(SUM(sale_amount),0) as revenue FROM ${schema}.sales`);
          salesVolume += parseFloat(salesRes.rows[0].volume);
          totalRevenue += parseFloat(salesRes.rows[0].revenue);
        }
        successResponse(res, { totalTenants, activeTenants, totalStations, salesVolume, totalRevenue });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}
