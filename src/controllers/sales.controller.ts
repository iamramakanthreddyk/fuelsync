// Types handled by TypeScript compilation
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { parseSalesQuery } from '../validators/sales.validator';
import { listSales, salesAnalytics } from '../services/sales.service';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { normalizeStationId } from '../utils/normalizeStationId';
import { hasStationAccess } from '../utils/hasStationAccess';

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
          const allowed = await hasStationAccess(db, user, query.stationId);
          if (!allowed) {
            return errorResponse(res, 403, 'Station access denied');
          }
        }
        const sales = await listSales(db, user.tenantId, query);
        if (sales.length === 0) {
          return successResponse(res, []);
        }
        // Ensure all required fields are present in the response
        const enrichedSales = sales.map(sale => ({
          ...sale,
          stationName: sale.station_name || sale.stationName || 'Unknown Station',
          pumpName: sale.pump_name || sale.pumpName || 'Unknown Pump',
          nozzleNumber: sale.nozzle_number || sale.nozzleNumber || 'N/A',
          fuelPrice: sale.price_per_liter || sale.fuel_price || 0
        }));
        
        successResponse(res, { sales: enrichedSales });
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
        if (stationId) {
          const allowed = await hasStationAccess(db, user, stationId);
          if (!allowed) {
            return errorResponse(res, 403, 'Station access denied');
          }
        }
        const data = await salesAnalytics(db, user.tenantId, stationId, groupBy);
        successResponse(res, { analytics: data });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    }
  };
}
