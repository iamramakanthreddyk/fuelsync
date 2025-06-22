import { PoolClient } from 'pg';
import { getSafeSchema } from './schemaUtils';

export async function getPriceAtTimestamp(
  client: PoolClient,
  tenantId: string,
  stationId: string,
  fuelType: string,
  timestamp: Date
): Promise<number | null> {
  const schema = getSafeSchema(tenantId);
  const res = await client.query<{ price: number }>(
    `SELECT price FROM ${schema}.fuel_prices
     WHERE station_id = $1 AND fuel_type = $2 AND effective_from <= $3
     ORDER BY effective_from DESC
     LIMIT 1`,
    [stationId, fuelType, timestamp]
  );
  return res.rows[0]?.price ?? null;
}
