import { Request, Response } from 'express';
import { Pool } from 'pg';
import { parseSalesQuery } from '../validators/sales.validator';
import { listSales } from '../services/sales.service';
import { errorResponse } from '../utils/errorResponse';

export function createSalesHandlers(db: Pool) {
  return {
    list: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const query = parseSalesQuery(req.query);
        if (query.stationId) {
          const access = await db.query(
            `SELECT 1 FROM ${user.tenantId}.user_stations WHERE user_id = $1 AND station_id = $2`,
            [user.userId, query.stationId]
          );
          if (!access.rowCount) {
            return errorResponse(res, 403, 'Station access denied');
          }
        }
        const sales = await listSales(db, user.tenantId, query);
        res.json({ sales });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
  };
}
