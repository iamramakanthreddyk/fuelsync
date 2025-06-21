import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createPump, listPumps, deletePump } from '../services/pump.service';
import { validateCreatePump } from '../validators/pump.validator';

export function createPumpHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const data = validateCreatePump(req.body);
        const id = await createPump(db, tenantId, data.stationId, data.label);
        res.status(201).json({ id });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
    list: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
      }
      const stationId = req.query.stationId as string | undefined;
      const pumps = await listPumps(db, tenantId, stationId);
      res.json({ pumps });
    },
    remove: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        await deletePump(db, tenantId, req.params.id);
        res.json({ status: 'ok' });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
  };
}
