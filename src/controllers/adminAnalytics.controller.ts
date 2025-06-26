import { Request, Response } from 'express';
import { Pool } from 'pg';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';

export function createAdminAnalyticsHandlers(db: Pool) {
  return {
    getAnalytics: async (_req: Request, res: Response) => {
      try {
        const tenantsRes = await db.query('SELECT id, status FROM public.tenants');
        const totalTenants = tenantsRes.rowCount;
        const activeTenants = tenantsRes.rows.filter(t => t.status === 'active').length;
        const stationRes = await db.query('SELECT COUNT(*) FROM public.stations');
        const totalStations = parseInt(stationRes.rows[0].count);
        const salesRes = await db.query(`SELECT COALESCE(SUM(volume_sold),0) as volume, COALESCE(SUM(sale_amount),0) as revenue FROM public.sales`);
        const salesVolume = parseFloat(salesRes.rows[0].volume);
        const totalRevenue = parseFloat(salesRes.rows[0].revenue);
        successResponse(res, { totalTenants, activeTenants, totalStations, salesVolume, totalRevenue });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}
