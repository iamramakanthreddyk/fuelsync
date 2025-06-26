import { PoolClient } from 'pg';

export async function getPriceAtTimestamp(
  client: PoolClient,
  tenantId: string,
  stationId: string,
  fuelType: string,
  timestamp: Date
): Promise<number | null> {
  const res = await client.query<{ price: number }>(
    `SELECT price FROM public.fuel_prices
     WHERE tenant_id = $1 AND station_id = $2 AND fuel_type = $3 AND effective_from <= $4
     ORDER BY effective_from DESC
     LIMIT 1`,
    [tenantId, stationId, fuelType, timestamp]
  );
  return res.rows[0]?.price ?? null;
}
