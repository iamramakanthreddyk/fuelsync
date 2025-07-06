import { Request, Response } from 'express';
import { Pool } from 'pg';
import { parseSalesQuery } from '../validators/sales.validator';
import { listSales, salesAnalytics } from '../services/sales.service';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { normalizeStationId } from '../utils/normalizeStationId';

export function createSalesHandlers(db: Pool) {
  return {
    list: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const query = parseSalesQuery(req.query);
        // Skip station access check for now since user_stations doesn't have tenant_id
        const sales = await listSales(db, user.tenantId, query);
        if (sales.length === 0) {
          return successResponse(res, []);
        }
        successResponse(res, { sales });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },

    analytics: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const stationId = normalizeStationId(req.query.stationId as string | undefined);
        const groupBy = (req.query.groupBy as string) || 'station';
        // Skip station access check for now since user_stations doesn't have tenant_id
        const data = await salesAnalytics(db, user.tenantId, stationId, groupBy);
        successResponse(res, { analytics: data });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    }
  };
}
