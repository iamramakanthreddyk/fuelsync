import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

/** Create a tenant and apply the schema template. Returns tenant id. */
export async function createTenant(
  client: Client,
  data: { name: string; schemaName: string; planId: string }
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO public.tenants (name, schema_name, plan_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (schema_name) DO UPDATE SET name=EXCLUDED.name
     RETURNING id`,
    [data.name, data.schemaName, data.planId]
  );
  const tenantId = rows[0].id;

  const templatePath = path.join(process.cwd(), 'migrations/tenant_schema_template.sql');
  const templateSql = fs.readFileSync(templatePath, 'utf8').replace(/{{schema_name}}/g, data.schemaName);
  await client.query(templateSql);

  return tenantId;
}

/** Create a station within a tenant schema. Returns station id. */
export async function createStation(
  client: Client,
  schema: string,
  tenantId: string,
  data: { name: string }
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO ${schema}.stations (tenant_id, name)
     VALUES ($1, $2)
     ON CONFLICT (tenant_id, name) DO UPDATE SET name=EXCLUDED.name
     RETURNING id`,
    [tenantId, data.name]
  );
  return rows[0].id;
}

/** Create a pump within a station. Returns pump id. */
export async function createPump(
  client: Client,
  schema: string,
  stationId: string,
  tenantId: string,
  data: { name: string }
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO ${schema}.pumps (tenant_id, station_id, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (station_id, name) DO UPDATE SET name=EXCLUDED.name
     RETURNING id`,
    [tenantId, stationId, data.name]
  );
  return rows[0].id;
}

/** Create multiple nozzles for a pump. */
export async function createNozzles(
  client: Client,
  schema: string,
  pumpId: string,
  tenantId: string,
  data: { nozzleNumber: number; fuelType: string }[]
): Promise<void> {
  for (const nozzle of data) {
    await client.query(
      `INSERT INTO ${schema}.nozzles (tenant_id, pump_id, nozzle_number, fuel_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (pump_id, nozzle_number) DO NOTHING`,
      [tenantId, pumpId, nozzle.nozzleNumber, nozzle.fuelType]
    );
  }
}

/** Fetch the latest reading for a nozzle. */
export async function getLatestReading(
  client: Client,
  schema: string,
  nozzleId: string
): Promise<any | null> {
  const { rows } = await client.query(
    `SELECT * FROM ${schema}.nozzle_readings
     WHERE nozzle_id = $1
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [nozzleId]
  );
  return rows[0] || null;
}

/** Get the active fuel price for a station and fuel type at a given time. */
export async function getCurrentFuelPrice(
  client: Client,
  schema: string,
  stationId: string,
  fuelType: string,
  atTime: Date = new Date()
): Promise<number | null> {
  const { rows } = await client.query<{ price: number }>(
    `SELECT price FROM ${schema}.fuel_prices
     WHERE station_id = $1
       AND fuel_type = $2
       AND effective_from <= $3
     ORDER BY effective_from DESC
     LIMIT 1`,
    [stationId, fuelType, atTime]
  );
  return rows[0]?.price ?? null;
}

