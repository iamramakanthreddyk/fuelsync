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
      'SELECT 1 FROM public.stations WHERE id = $1::uuid AND tenant_id = $2::uuid',
      [stationId, user.tenantId]
    );
    return (res.rowCount ?? 0) > 0;
  }
  const res = await db.query(
    `SELECT 1
       FROM public.user_stations us
       JOIN public.stations s ON s.id = us.station_id
      WHERE us.user_id = $1::uuid AND us.station_id = $2::uuid AND s.tenant_id = $3::uuid`,
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
    'SELECT 1 FROM public.stations WHERE id = $1::uuid AND tenant_id = $2::uuid',
    [stationId, tenantId]
  );
  return (res.rowCount ?? 0) > 0;
}
