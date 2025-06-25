import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createNozzle, listNozzles, deleteNozzle } from '../services/nozzle.service';
import { validateCreateNozzle } from '../validators/nozzle.validator';
import { errorResponse } from '../utils/errorResponse';

export function createNozzleHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreateNozzle(req.body);
        const id = await createNozzle(db, schemaName, data.pumpId, data.nozzleNumber, data.fuelType);
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
      const pumpId = req.query.pumpId as string | undefined;
      const nozzles = await listNozzles(db, schemaName, pumpId);
      res.json({ nozzles });
    },
    remove: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        await deleteNozzle(db, schemaName, req.params.id);
        res.json({ status: 'ok' });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
  };
}
