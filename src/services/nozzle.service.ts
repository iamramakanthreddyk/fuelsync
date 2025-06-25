import { Pool } from 'pg';
import { beforeCreateNozzle } from '../middleware/planEnforcement';

export async function createNozzle(db: Pool, schemaName: string, pumpId: string, nozzleNumber: number, fuelType: string): Promise<string> {
  const client = await db.connect();
  try {
    // Get actual tenant UUID from schema name
    const tenantRes = await client.query(
      'SELECT id FROM public.tenants WHERE schema_name = $1',
      [schemaName]
    );
    
    if (tenantRes.rows.length === 0) {
      throw new Error(`Tenant not found for schema: ${schemaName}`);
    }
    
    const tenantId = tenantRes.rows[0].id;
    
    await beforeCreateNozzle(client, schemaName, pumpId);
    const res = await client.query<{ id: string }>(
      `INSERT INTO ${schemaName}.nozzles (tenant_id, pump_id, nozzle_number, fuel_type) VALUES ($1,$2,$3,$4) RETURNING id`,
      [tenantId, pumpId, nozzleNumber, fuelType]
    );
    return res.rows[0].id;
  } finally {
    client.release();
  }
}

export async function listNozzles(db: Pool, schemaName: string, pumpId?: string) {
  const where = pumpId ? 'WHERE pump_id = $1' : '';
  const params = pumpId ? [pumpId] : [];
  const res = await db.query(
    `SELECT id, pump_id, nozzle_number, fuel_type, status, created_at FROM ${schemaName}.nozzles ${where} ORDER BY nozzle_number`,
    params
  );
  return res.rows;
}

export async function deleteNozzle(db: Pool, schemaName: string, nozzleId: string) {
  const count = await db.query(`SELECT COUNT(*) FROM ${schemaName}.sales WHERE nozzle_id = $1`, [nozzleId]);
  if (Number(count.rows[0].count) > 0) {
    throw new Error('Cannot delete nozzle with sales history');
  }
  await db.query(`DELETE FROM ${schemaName}.nozzles WHERE id = $1`, [nozzleId]);
}
