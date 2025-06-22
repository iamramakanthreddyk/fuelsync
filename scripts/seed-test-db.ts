import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

import { createTestDb } from './create-test-db';

dotenv.config({ path: '.env.test' });

export async function seedTestDb(): Promise<void> {
  await createTestDb();

  const host = process.env.PGHOST || 'localhost';
  const port = parseInt(process.env.PGPORT || '5432');
  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || 'postgres';
  const dbName = process.env.PGDATABASE || 'fuelsync_test';
  const schema = process.env.TEST_SCHEMA || 'test_schema';

  const client = new Client({ host, port, user, password, database: dbName });
  await client.connect();

  const { rows: planRows } = await client.query(`SELECT id FROM public.plans WHERE name='basic' LIMIT 1`);
  const planId = planRows[0].id;

  await client.query(
    `INSERT INTO public.tenants (name, schema_name, plan_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (schema_name) DO NOTHING`,
    ['Test Tenant', schema, planId]
  );

  const template = fs
    .readFileSync(path.join(__dirname, '../migrations/tenant_schema_template.sql'), 'utf8')
    .replace(/{{schema_name}}/g, schema);
  await client.query(template);

  const { rows: tenantRows } = await client.query(`SELECT id FROM public.tenants WHERE schema_name=$1 LIMIT 1`, [schema]);
  const tenantId = tenantRows[0].id;

  const hash = await bcrypt.hash('password', 1);
  const { rows: userRows } = await client.query(
    `INSERT INTO ${schema}.users (tenant_id, email, password_hash, role)
     VALUES ($1, 'owner@${schema}.com', $2, 'owner')
     ON CONFLICT (email) DO UPDATE SET email=EXCLUDED.email
     RETURNING id`,
    [tenantId, hash]
  );
  const userId = userRows[0].id;

  let { rows: stationRows } = await client.query(
    `INSERT INTO ${schema}.stations (tenant_id, name)
     VALUES ($1, 'Station 1')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [tenantId]
  );
  if (!stationRows.length) {
    stationRows = (
      await client.query(`SELECT id FROM ${schema}.stations WHERE name='Station 1' LIMIT 1`)
    ).rows;
  }
  const stationId = stationRows[0].id;

  let { rows: pumpRows } = await client.query(
    `INSERT INTO ${schema}.pumps (tenant_id, station_id, name)
     VALUES ($1, $2, 'Pump 1')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [tenantId, stationId]
  );
  if (!pumpRows.length) {
    pumpRows = (
      await client.query(`SELECT id FROM ${schema}.pumps WHERE station_id=$1 AND name='Pump 1' LIMIT 1`, [stationId])
    ).rows;
  }
  const pumpId = pumpRows[0].id;

  let { rows: nozzleRows } = await client.query(
    `INSERT INTO ${schema}.nozzles (tenant_id, pump_id, nozzle_number, fuel_type)
     VALUES ($1, $2, 1, 'petrol')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [tenantId, pumpId]
  );
  if (!nozzleRows.length) {
    nozzleRows = (
      await client.query(`SELECT id FROM ${schema}.nozzles WHERE pump_id=$1 AND nozzle_number=1 LIMIT 1`, [pumpId])
    ).rows;
  }
  const nozzleId = nozzleRows[0].id;

  await client.query(
    `INSERT INTO ${schema}.fuel_prices (tenant_id, station_id, fuel_type, price, effective_from)
     VALUES ($1, $2, 'petrol', 100, NOW())
     ON CONFLICT DO NOTHING`,
    [tenantId, stationId]
  );

  await client.query(
    `INSERT INTO ${schema}.creditors (tenant_id, party_name)
     VALUES ($1, 'Test Creditor')
     ON CONFLICT DO NOTHING`,
    [tenantId]
  );

  await client.query(
    `INSERT INTO ${schema}.nozzle_readings (tenant_id, nozzle_id, reading)
     VALUES ($1, $2, 0)`,
    [tenantId, nozzleId]
  );

  await client.end();
}

if (require.main === module) {
  seedTestDb().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
