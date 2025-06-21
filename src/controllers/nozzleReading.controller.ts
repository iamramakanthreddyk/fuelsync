import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createNozzleReading, listNozzleReadings } from '../services/nozzleReading.service';
import { validateCreateNozzleReading, parseReadingQuery } from '../validators/nozzleReading.validator';

export function createNozzleReadingHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId || !user.userId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const data = validateCreateNozzleReading(req.body);
        const id = await createNozzleReading(db, user.tenantId, data, user.userId);
        res.status(201).json({ id });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
    list: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const query = parseReadingQuery(req.query);
        if (query.stationId) {
          const access = await db.query(
            `SELECT 1 FROM ${user.tenantId}.user_stations WHERE user_id = $1 AND station_id = $2`,
            [user.userId, query.stationId]
          );
          if (!access.rowCount) {
            return res.status(403).json({ status: 'error', message: 'Station access denied' });
          }
        }
        const readings = await listNozzleReadings(db, user.tenantId, query);
        res.json({ readings });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
  };
}
