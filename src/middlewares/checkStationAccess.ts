import { Pool } from 'pg';
// Types handled by TypeScript compilation
import { Request, Response, NextFunction } from 'express';
import { hasStationAccess } from '../utils/hasStationAccess';

export function checkStationAccess(db: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const stationId = req.params.stationId || req.body.stationId || req.query.stationId;
    if (!user || !user.tenantId || !stationId) {
      return res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'Station access denied' });
    }
    const allowed = await hasStationAccess(db, user, stationId);
    if (!allowed) {
      return res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'Station access denied' });
    }
    next();
  };
}
