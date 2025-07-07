import { Request, Response } from 'express';
import { Pool } from 'pg';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { 
  getReconciliationDiffs, 
  getReconciliationDiffById, 
  getDashboardDiscrepancySummary 
} from '../services/reconciliation-diff.service';

export function createReconciliationDiffHandlers(db: Pool) {
  return {
    list: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { stationId, startDate, endDate, status } = req.query;
        
        const diffs = await getReconciliationDiffs(
          db,
          user.tenantId,
          stationId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined,
          status as 'match' | 'over' | 'short'
        );

        successResponse(res, diffs);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    getById: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { id } = req.params;
        const diff = await getReconciliationDiffById(db, user.tenantId, id);

        if (!diff) {
          return errorResponse(res, 404, 'Reconciliation difference not found');
        }

        successResponse(res, diff);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    getSummary: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const summary = await getDashboardDiscrepancySummary(db, user.tenantId);
        successResponse(res, summary);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}