import { Pool } from 'pg';
import { beforeCreatePump } from '../middleware/planEnforcement';

export async function createPump(db: Pool, tenantId: string, stationId: string, label: string): Promise<string> {
  const client = await db.connect();
  try {
    await beforeCreatePump(client, tenantId, stationId);
    const res = await client.query<{ id: string }>(
      `INSERT INTO ${tenantId}.pumps (station_id, label) VALUES ($1,$2) RETURNING id`,
      [stationId, label]
    );
    return res.rows[0].id;
  } finally {
    client.release();
  }
}

export async function listPumps(db: Pool, tenantId: string, stationId?: string) {
  const where = stationId ? 'WHERE station_id = $1' : '';
  const params = stationId ? [stationId] : [];
  const res = await db.query(
    `SELECT id, station_id, label, created_at FROM ${tenantId}.pumps ${where} ORDER BY label`,
    params
  );
  return res.rows;
}

export async function deletePump(db: Pool, tenantId: string, pumpId: string) {
  const count = await db.query(`SELECT COUNT(*) FROM ${tenantId}.nozzles WHERE pump_id = $1`, [pumpId]);
  if (Number(count.rows[0].count) > 0) {
    throw new Error('Cannot delete pump with nozzles');
  }
  await db.query(`DELETE FROM ${tenantId}.pumps WHERE id = $1`, [pumpId]);
}
