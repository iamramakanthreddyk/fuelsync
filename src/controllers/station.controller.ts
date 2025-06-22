import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createStation, listStations, updateStation, deleteStation } from '../services/station.service';
import { validateCreateStation, validateUpdateStation } from '../validators/station.validator';

export function createStationHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const data = validateCreateStation(req.body);
        const id = await createStation(db, tenantId, data.name);
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
      const stations = await listStations(db, tenantId);
      res.json({ stations });
    },
    update: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const data = validateUpdateStation(req.body);
        await updateStation(db, tenantId, req.params.id, data.name);
        res.json({ status: 'ok' });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
    remove: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        await deleteStation(db, tenantId, req.params.id);
        res.json({ status: 'ok' });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
  };
}
