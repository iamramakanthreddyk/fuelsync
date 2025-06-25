import { Pool } from 'pg';
import { FuelPriceInput, FuelPriceQuery } from '../validators/fuelPrice.validator';

export async function createFuelPrice(db: Pool, schemaName: string, input: FuelPriceInput): Promise<string> {
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
    
    await client.query('BEGIN');
    const res = await client.query<{ id: string }>(
      `INSERT INTO ${schemaName}.fuel_prices (tenant_id, station_id, fuel_type, price, valid_from)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [tenantId, input.stationId, input.fuelType, input.price, input.effectiveFrom || new Date()]
    );
    await client.query('COMMIT');
    return res.rows[0].id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateFuelPrice(db: Pool, tenantId: string, id: string, input: FuelPriceInput): Promise<void> {
  await db.query(
    `UPDATE ${tenantId}.fuel_prices
     SET station_id = $2, fuel_type = $3, price = $4, effective_from = $5
     WHERE id = $1`,
    [id, input.stationId, input.fuelType, input.price, input.effectiveFrom]
  );
}

export async function listFuelPrices(db: Pool, schemaName: string, query: FuelPriceQuery) {
  const params: any[] = [];
  let idx = 1;
  const conds: string[] = [];
  if (query.stationId) {
    conds.push(`station_id = $${idx++}`);
    params.push(query.stationId);
  }
  if (query.fuelType) {
    conds.push(`fuel_type = $${idx++}`);
    params.push(query.fuelType);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const sql = `SELECT id, station_id, fuel_type, price, valid_from, created_at
               FROM ${schemaName}.fuel_prices
               ${where}
               ORDER BY valid_from DESC`;
  const res = await db.query(sql, params);
  return res.rows;
}

export async function getPriceAt(db: Pool, tenantId: string, stationId: string, fuelType: string, at: Date): Promise<number | null> {
  const res = await db.query<{ price: number }>(
    `SELECT price FROM ${tenantId}.fuel_prices
     WHERE station_id = $1 AND fuel_type = $2
       AND effective_from <= $3
       AND (effective_to IS NULL OR effective_to >= $3)
     ORDER BY effective_from DESC
     LIMIT 1`,
    [stationId, fuelType, at]
  );
  return res.rows[0]?.price ?? null;
}
