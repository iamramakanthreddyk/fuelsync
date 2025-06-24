import { Pool } from 'pg';
import { Request, Response, NextFunction } from 'express';

export function checkStationAccess(db: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const stationId = req.params.stationId || req.body.stationId || req.query.stationId;
    if (!user || !user.tenantId || !stationId) {
      return res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'Station access denied' });
    }
    const result = await db.query(
      `SELECT 1 FROM ${user.tenantId}.user_stations WHERE user_id = $1 AND station_id = $2`,
      [user.userId, stationId]
    );
    if (!result.rowCount) {
      return res.status(403).json({ status: 'error', code: 'FORBIDDEN', message: 'Station access denied' });
    }
    next();
  };
}
