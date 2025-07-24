import { Request, Response } from 'express';
import { Pool } from 'pg';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { getTodaysSalesSummary } from '../services/todaysSales.service';

export function createTodaysSalesHandlers(db: Pool) {
  return {
    getTodaysSummary: async (req: Request, res: Response) => {
      try {
        console.log('[TODAYS-SALES-CONTROLLER] Request received');
        const user = req.user;
        if (!user?.tenantId) {
          console.log('[TODAYS-SALES-CONTROLLER] Missing tenant context');
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();
        console.log('[TODAYS-SALES-CONTROLLER] Fetching for tenant:', user.tenantId, 'date:', targetDate);

        const summary = await getTodaysSalesSummary(db, user.tenantId, targetDate);
        console.log('[TODAYS-SALES-CONTROLLER] Summary result:', summary);
        successResponse(res, summary);
      } catch (err: any) {
        console.error('[TODAYS-SALES-CONTROLLER] Error:', err);
        return errorResponse(res, 500, err.message);
      }
    }
  };
}