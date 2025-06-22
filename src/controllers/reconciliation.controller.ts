import { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  runReconciliation,
  getReconciliation,
} from '../services/reconciliation.service';
import { errorResponse } from '../utils/errorResponse';

export function createReconciliationHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const { stationId, reconciliationDate } = req.body || {};
        if (!stationId || !reconciliationDate) {
          return errorResponse(res, 400, 'stationId and reconciliationDate required');
        }
        const date = new Date(reconciliationDate);
        if (isNaN(date.getTime())) {
          return errorResponse(res, 400, 'Invalid reconciliationDate');
        }
        const summary = await runReconciliation(db, user.tenantId, stationId, date);
        res.status(201).json({ summary });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    get: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const { stationId } = req.params;
        const dateStr = req.query.date as string;
        if (!stationId || !dateStr) {
          return errorResponse(res, 400, 'stationId and date required');
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          return errorResponse(res, 400, 'Invalid date');
        }
        const summary = await getReconciliation(db, user.tenantId, stationId, date);
        if (!summary) {
          return errorResponse(res, 404, 'Not found');
        }
        res.json({ summary });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
  };
}
