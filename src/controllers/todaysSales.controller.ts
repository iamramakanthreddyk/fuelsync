import { Request, Response } from 'express';
import { Pool } from 'pg';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { getTodaysSalesSummary } from '../services/todaysSales.service';

export function createTodaysSalesHandlers(db: Pool) {
  return {
    getTodaysSummary: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        const summary = await getTodaysSalesSummary(db, user.tenantId, targetDate);
        successResponse(res, summary);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}