import { Pool } from 'pg';
import { FuelPriceInput, FuelPriceQuery } from '../validators/fuelPrice.validator';

export async function createFuelPrice(db: Pool, tenantId: string, input: FuelPriceInput): Promise<string> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const overlap = await client.query<{ id: string; effective_to: Date | null }>(
      `SELECT id, effective_to FROM ${tenantId}.fuel_prices
       WHERE station_id = $1 AND fuel_type = $2
         AND effective_from <= $3
         AND (effective_to IS NULL OR effective_to >= $3)
       ORDER BY effective_from DESC
       LIMIT 1`,
      [input.stationId, input.fuelType, input.effectiveFrom]
    );
    if (overlap.rowCount) {
      const row = overlap.rows[0];
      if (row.effective_to === null) {
        await client.query(
          `UPDATE ${tenantId}.fuel_prices SET effective_to = $2 WHERE id = $1`,
          [row.id, new Date(input.effectiveFrom.getTime() - 1000)]
        );
      } else {
        throw new Error('Overlapping price range');
      }
    }
    const res = await client.query<{ id: string }>(
      `INSERT INTO ${tenantId}.fuel_prices (tenant_id, station_id, fuel_type, price, effective_from)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [tenantId, input.stationId, input.fuelType, input.price, input.effectiveFrom]
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

export async function listFuelPrices(db: Pool, tenantId: string, query: FuelPriceQuery) {
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
  const sql = `SELECT id, station_id, fuel_type, price, effective_from, effective_to
               FROM ${tenantId}.fuel_prices
               ${where}
               ORDER BY effective_from DESC`;
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
