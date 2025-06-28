import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { beforeCreateNozzle } from '../middleware/planEnforcement';

export async function createNozzle(db: Pool, tenantId: string, pumpId: string, nozzleNumber: number, fuelType: string): Promise<string> {
  const client = await db.connect();
  try {
    await beforeCreateNozzle(client, tenantId, pumpId);
    const res = await client.query<{ id: string }>(
      'INSERT INTO public.nozzles (id, tenant_id, pump_id, nozzle_number, fuel_type, updated_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id',
      [randomUUID(), tenantId, pumpId, nozzleNumber, fuelType]
    );
    return res.rows[0].id;
  } finally {
    client.release();
  }
}

export async function updateNozzle(db: Pool, tenantId: string, nozzleId: string, fuelType?: string, status?: string): Promise<void> {
  const client = await db.connect();
  try {
    const updates = [];
    const params = [nozzleId];
    let paramIndex = 2;
    
    if (fuelType) {
      updates.push(`fuel_type = $${paramIndex++}`);
      params.push(fuelType);
    }
    
    if (status) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    
    if (updates.length === 0) {
      return; // Nothing to update
    }
    
    await client.query(
      `UPDATE public.nozzles SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2`,
      [...params, tenantId]
    );
  } finally {
    client.release();
  }
}

export async function listNozzles(db: Pool, tenantId: string, pumpId?: string) {
  const where = pumpId ? 'WHERE pump_id = $1' : '';
  const params = pumpId ? [pumpId, tenantId] : [tenantId];
  const res = await db.query(
    `SELECT id, pump_id, nozzle_number, fuel_type, status, created_at FROM public.nozzles ${where} ${where ? 'AND tenant_id = $2' : 'WHERE tenant_id = $1'} ORDER BY nozzle_number`,
    params
  );
  return res.rows;
}

export async function deleteNozzle(db: Pool, tenantId: string, nozzleId: string) {
  const count = await db.query('SELECT COUNT(*) FROM public.sales WHERE nozzle_id = $1 AND tenant_id = $2', [nozzleId, tenantId]);
  if (Number(count.rows[0].count) > 0) {
    throw new Error('Cannot delete nozzle with sales history');
  }
  await db.query('DELETE FROM public.nozzles WHERE id = $1 AND tenant_id = $2', [nozzleId, tenantId]);
}
