import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getAlerts, markAlertRead } from '../services/inventory.service';
import { errorResponse } from '../utils/errorResponse';

export function createAlertsHandlers(db: Pool) {
  return {
    list: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');

        const stationId = req.query.stationId as string | undefined;
        const unreadOnly = req.query.unreadOnly === 'true';
        const alerts = await getAlerts(db, tenantId, stationId, unreadOnly);
        res.json(alerts);
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
        res.json({ status: 'read' });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}
