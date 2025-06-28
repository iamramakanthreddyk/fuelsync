import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { DeliveryInput, DeliveryQuery } from '../validators/delivery.validator';

export async function createFuelDelivery(db: Pool, tenantId: string, input: DeliveryInput): Promise<string> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<{ id: string }>(
      `INSERT INTO ${tenantId}.fuel_deliveries (id, station_id, fuel_type, volume, delivered_by, delivery_date, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
      [randomUUID(), input.stationId, input.fuelType, input.volume, input.supplier || null, input.deliveryDate]
    );

    const inv = await client.query<{ id: string }>(
      `SELECT id FROM ${tenantId}.fuel_inventory WHERE station_id = $1 AND fuel_type = $2`,
      [input.stationId, input.fuelType]
    );
    if (inv.rowCount) {
      await client.query(
        `UPDATE ${tenantId}.fuel_inventory
           SET current_volume = current_volume + $3, updated_at = NOW()
         WHERE station_id = $1 AND fuel_type = $2`,
        [input.stationId, input.fuelType, input.volume]
      );
    } else {
      await client.query(
        `INSERT INTO ${tenantId}.fuel_inventory (id, station_id, fuel_type, current_volume, updated_at)
         VALUES ($1,$2,$3,$4,NOW())`,
        [randomUUID(), input.stationId, input.fuelType, input.volume]
      );
    }
    await client.query('COMMIT');
    return res.rows[0].id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listFuelDeliveries(db: Pool, tenantId: string, query: DeliveryQuery) {
  const params: any[] = [];
  let idx = 1;
  let where = '';
  if (query.stationId) {
    where = `WHERE station_id = $${idx++}`;
    params.push(query.stationId);
  }
  const sql = `SELECT id, station_id, fuel_type, volume, delivered_by, delivery_date, created_at
               FROM ${tenantId}.fuel_deliveries ${where}
               ORDER BY delivery_date DESC`;
  const res = await db.query(sql, params);
  return res.rows;
}
