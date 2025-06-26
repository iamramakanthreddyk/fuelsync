import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getAlerts, markAlertRead } from '../services/inventory.service';
import { deleteAlert } from '../services/alert.service';

// Controller supporting alert management endpoints used by the frontend
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';

export function createAlertsHandlers(db: Pool) {
  return {
    list: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');

        const stationId = req.query.stationId as string | undefined;
        const unreadOnly = req.query.unreadOnly === 'true';
        const alerts = await getAlerts(db, tenantId, stationId, unreadOnly);
        successResponse(res, alerts);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    markRead: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');

        const { id } = req.params;
        const updated = await markAlertRead(db, tenantId, id);
        if (!updated) return errorResponse(res, 404, 'Alert not found');
        successResponse(res, { status: 'read' });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    delete: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');

        const deleted = await deleteAlert(tenantId, req.params.id);
        if (!deleted) return errorResponse(res, 404, 'Alert not found');
        successResponse(res, true);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}
