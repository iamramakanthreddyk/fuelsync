import { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  runReconciliation,
  getReconciliation,
} from '../services/reconciliation.service';

export function createReconciliationHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const { stationId, reconciliationDate } = req.body || {};
        if (!stationId || !reconciliationDate) {
          return res.status(400).json({ status: 'error', message: 'stationId and reconciliationDate required' });
        }
        const date = new Date(reconciliationDate);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ status: 'error', message: 'Invalid reconciliationDate' });
        }
        const summary = await runReconciliation(db, user.tenantId, stationId, date);
        res.status(201).json({ summary });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
    get: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const { stationId } = req.params;
        const dateStr = req.query.date as string;
        if (!stationId || !dateStr) {
          return res.status(400).json({ status: 'error', message: 'stationId and date required' });
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ status: 'error', message: 'Invalid date' });
        }
        const summary = await getReconciliation(db, user.tenantId, stationId, date);
        if (!summary) {
          return res.status(404).json({ status: 'error', message: 'Not found' });
        }
        res.json({ summary });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
  };
}
