import { Pool } from 'pg';
import { beforeCreatePump } from '../middleware/planEnforcement';

export async function createPump(db: Pool, schemaName: string, stationId: string, label: string, serialNumber?: string): Promise<string> {
  const client = await db.connect();
  try {
    await beforeCreatePump(client, schemaName, stationId);
    
    // Get actual tenant UUID from schema name
    const tenantRes = await client.query(
      'SELECT id FROM public.tenants WHERE schema_name = $1',
      [schemaName]
    );
    
    if (tenantRes.rows.length === 0) {
      throw new Error(`Tenant not found for schema: ${schemaName}`);
    }
    
    const tenantId = tenantRes.rows[0].id;
    
    const res = await client.query<{ id: string }>(
      `INSERT INTO ${schemaName}.pumps (tenant_id, station_id, label, serial_number) VALUES ($1,$2,$3,$4) RETURNING id`,
      [tenantId, stationId, label, serialNumber || null]
    );
    return res.rows[0].id;
  } finally {
    client.release();
  }
}

export async function listPumps(db: Pool, schemaName: string, stationId?: string) {
  const where = stationId ? 'WHERE station_id = $1' : '';
  const params = stationId ? [stationId] : [];
  const res = await db.query(
    `SELECT id, station_id, label, serial_number, status, created_at FROM ${schemaName}.pumps ${where} ORDER BY label`,
    params
  );
  return res.rows;
}

export async function deletePump(db: Pool, schemaName: string, pumpId: string) {
  const count = await db.query(`SELECT COUNT(*) FROM ${schemaName}.nozzles WHERE pump_id = $1`, [pumpId]);
  if (Number(count.rows[0].count) > 0) {
    throw new Error('Cannot delete pump with nozzles');
  }
  await db.query(`DELETE FROM ${schemaName}.pumps WHERE id = $1`, [pumpId]);
}
