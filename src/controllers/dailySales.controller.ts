import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getDailySalesReport } from '../services/dailySales.service';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';

export function createDailySalesHandlers(db: Pool) {
  return {
    getDailySales: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const date = req.query.date as string;
        if (!date) {
          return errorResponse(res, 400, 'Date parameter is required (YYYY-MM-DD)');
        }

        const salesData = await getDailySalesReport(db, tenantId, date);
        
        // Calculate grand totals
        const grandTotalVolume = salesData.reduce((sum, station) => sum + station.totalVolume, 0);
        const grandTotalSales = salesData.reduce((sum, station) => sum + station.totalSales, 0);

        const report = {
          date,
          stations: salesData,
          grandTotalVolume,
          grandTotalSales
        };

        successResponse(res, report);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}