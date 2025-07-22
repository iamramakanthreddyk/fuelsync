import { Pool, PoolClient } from 'pg';
import { UserRole } from '../constants/auth';
import { AuthPayload } from '../types/auth';

export async function hasStationAccess(
  db: Pool,
  user: AuthPayload,
  stationId: string
): Promise<boolean> {
  if (!user.tenantId) return false;
  if (user.role === UserRole.Owner) {
    const res = await db.query(
      'SELECT 1 FROM public.stations WHERE id = $1 AND tenant_id = $2',
      [stationId, user.tenantId]
    );
    return (res.rowCount ?? 0) > 0;
  }
  const res = await db.query(
    `SELECT 1
       FROM public.user_stations us
       JOIN public.stations s ON s.id = us.station_id
      WHERE us.user_id = $1 AND us.station_id = $2 AND s.tenant_id = $3`,
    [user.userId, stationId, user.tenantId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function stationBelongsToTenant(
  db: Pool | PoolClient,
  stationId: string,
  tenantId: string
): Promise<boolean> {
  const res = await db.query(
    'SELECT 1 FROM public.stations WHERE id = $1 AND tenant_id = $2',
    [stationId, tenantId]
  );
  return (res.rowCount ?? 0) > 0;
}
