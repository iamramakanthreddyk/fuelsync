import { Pool } from 'pg';
import { beforeCreateNozzle } from '../middleware/planEnforcement';

export async function createNozzle(db: Pool, tenantId: string, pumpId: string, fuelType: string): Promise<string> {
  const client = await db.connect();
  try {
    await beforeCreateNozzle(client, tenantId, pumpId);
    const res = await client.query<{ id: string }>(
      `INSERT INTO ${tenantId}.nozzles (pump_id, fuel_type) VALUES ($1,$2) RETURNING id`,
      [pumpId, fuelType]
    );
    return res.rows[0].id;
  } finally {
    client.release();
  }
}

export async function listNozzles(db: Pool, tenantId: string, pumpId?: string) {
  const where = pumpId ? 'WHERE pump_id = $1' : '';
  const params = pumpId ? [pumpId] : [];
  const res = await db.query(
    `SELECT id, pump_id, fuel_type, created_at FROM ${tenantId}.nozzles ${where} ORDER BY fuel_type`,
    params
  );
  return res.rows;
}

export async function deleteNozzle(db: Pool, tenantId: string, nozzleId: string) {
  const count = await db.query(`SELECT COUNT(*) FROM ${tenantId}.sales WHERE nozzle_id = $1`, [nozzleId]);
  if (Number(count.rows[0].count) > 0) {
    throw new Error('Cannot delete nozzle with sales history');
  }
  await db.query(`DELETE FROM ${tenantId}.nozzles WHERE id = $1`, [nozzleId]);
}
