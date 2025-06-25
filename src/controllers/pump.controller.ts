import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createPump, listPumps, deletePump } from '../services/pump.service';
import { validateCreatePump } from '../validators/pump.validator';
import { errorResponse } from '../utils/errorResponse';

export function createPumpHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreatePump(req.body);
        const id = await createPump(db, schemaName, data.stationId, data.label, data.serialNumber);
        res.status(201).json({ id });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (req: Request, res: Response) => {
      const schemaName = (req as any).schemaName;
      if (!schemaName) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      const stationId = req.query.stationId as string | undefined;
      const pumps = await listPumps(db, schemaName, stationId);
      res.json({ pumps });
    },
    remove: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        await deletePump(db, schemaName, req.params.id);
        res.json({ status: 'ok' });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
  };
}
