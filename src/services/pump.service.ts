import { Pool } from 'pg';
import { beforeCreatePump } from '../middleware/planEnforcement';

export async function createPump(db: Pool, schemaName: string, stationId: string, label: string, serialNumber?: string): Promise<string> {
  const client = await db.connect();
  try {
    // Get actual tenant UUID from schema name FIRST
    const tenantRes = await client.query(
      'SELECT id FROM public.tenants WHERE schema_name = $1',
      [schemaName]
    );
    
    if (tenantRes.rows.length === 0) {
      throw new Error(`Tenant not found for schema: ${schemaName}`);
    }
    
    const tenantId = tenantRes.rows[0].id;
    
    // Pass schema name to beforeCreatePump (it uses schema for table queries)
    await beforeCreatePump(client, schemaName, stationId);
    
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
  const where = stationId ? 'WHERE p.station_id = $1' : '';
  const params = stationId ? [stationId] : [];
  const res = await db.query(
    `SELECT p.id, p.station_id, p.label, p.serial_number, p.status, p.created_at,
     (SELECT COUNT(*) FROM ${schemaName}.nozzles n WHERE n.pump_id = p.id) as nozzle_count
     FROM ${schemaName}.pumps p ${where} ORDER BY p.label`,
    params
  );
  return res.rows.map(row => ({
    ...row,
    nozzleCount: parseInt(row.nozzle_count)
  }));
}

export async function deletePump(db: Pool, schemaName: string, pumpId: string) {
  const count = await db.query(`SELECT COUNT(*) FROM ${schemaName}.nozzles WHERE pump_id = $1`, [pumpId]);
  if (Number(count.rows[0].count) > 0) {
    throw new Error('Cannot delete pump with nozzles');
  }
  await db.query(`DELETE FROM ${schemaName}.pumps WHERE id = $1`, [pumpId]);
}

export async function updatePump(
  db: Pool,
  schemaName: string,
  pumpId: string,
  label?: string,
  serialNumber?: string
) {
  const updates = [] as string[];
  const params = [pumpId];
  let idx = 2;

  if (label !== undefined) {
    updates.push(`label = $${idx}`);
    params.push(label);
    idx++;
  }

  if (serialNumber !== undefined) {
    updates.push(`serial_number = $${idx}`);
    params.push(serialNumber);
    idx++;
  }

  if (updates.length === 0) return;

  await db.query(
    `UPDATE ${schemaName}.pumps SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1`,
    params
  );
}
