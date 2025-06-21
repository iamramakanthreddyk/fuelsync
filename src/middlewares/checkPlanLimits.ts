import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { beforeCreateStation, beforeCreatePump, beforeCreateNozzle } from '../middleware/planEnforcement';

export function checkStationLimit(db: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
    }
    const client = await db.connect();
    try {
      await beforeCreateStation(client, tenantId);
      next();
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    } finally {
      client.release();
    }
  };
}

export function checkPumpLimit(db: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId;
    const stationId = req.body.stationId;
    if (!tenantId || !stationId) {
      return res.status(400).json({ status: 'error', message: 'Missing context' });
    }
    const client = await db.connect();
    try {
      await beforeCreatePump(client, tenantId, stationId);
      next();
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    } finally {
      client.release();
    }
  };
}

export function checkNozzleLimit(db: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId;
    const pumpId = req.body.pumpId;
    if (!tenantId || !pumpId) {
      return res.status(400).json({ status: 'error', message: 'Missing context' });
    }
    const client = await db.connect();
    try {
      await beforeCreateNozzle(client, tenantId, pumpId);
      next();
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    } finally {
      client.release();
    }
  };
}
