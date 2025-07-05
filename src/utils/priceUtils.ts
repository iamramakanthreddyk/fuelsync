import { Pool, PoolClient } from 'pg';

export type TxClient = Pool | PoolClient;

export interface PriceRecord {
  price: number;
  validFrom: Date;
}

export async function getPriceAtTimestamp(
  client: TxClient,
  tenantId: string,
  stationId: string,
  fuelType: string,
  timestamp: Date
): Promise<PriceRecord | null> {
  const res = await client.query<{
    price: number;
    valid_from: Date;
  }>(
    `SELECT price, valid_from
       FROM public.fuel_prices
      WHERE tenant_id = $1
        AND station_id = $2
        AND fuel_type = $3
        AND valid_from <= $4
      ORDER BY valid_from DESC
      LIMIT 1`,
    [tenantId, stationId, fuelType, timestamp]
  );
  if (!res.rowCount) return null;
  const row = res.rows[0];
  return { price: Number(row.price), validFrom: row.valid_from };
}
