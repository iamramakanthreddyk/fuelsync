import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const schema = process.argv[2] || 'demo_tenant_001';
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // ensure tenant exists in public.tenants and fetch id
  const { rows: planRows } = await client.query(
    `SELECT id FROM public.plans WHERE name='basic' LIMIT 1`
  );
  const planId = planRows[0].id;
  const { rows: tenantRows } = await client.query(
    `INSERT INTO public.tenants (name, schema_name, plan_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (schema_name) DO UPDATE SET name=EXCLUDED.name
     RETURNING id`,
    [schema, schema, planId]
  );
  const tenantId = tenantRows[0].id;

  // apply tenant schema template
  const templatePath = path.join(__dirname, '../migrations/tenant_schema_template.sql');
  const templateSql = fs.readFileSync(templatePath, 'utf8').replace(/{{schema_name}}/g, schema);
  await client.query(templateSql);

  // users
  const roles = ['owner', 'manager', 'attendant'];
  for (const role of roles) {
    await client.query(
      `INSERT INTO ${schema}.users (tenant_id, email, password_hash, role)
       VALUES ($1, $2, 'demo-hash', $3)
       ON CONFLICT (email) DO NOTHING`,
      [tenantId, `${role}@${schema}.com`, role]
    );
  }

  // station
  const { rows: stationRows } = await client.query(
    `INSERT INTO ${schema}.stations (tenant_id, name)
     VALUES ($1, 'Main Station')
     ON CONFLICT (tenant_id, name) DO UPDATE SET name=EXCLUDED.name
     RETURNING id`,
    [tenantId]
  );
  const stationId = stationRows[0].id;

  // pump
  const { rows: pumpRows } = await client.query(
    `INSERT INTO ${schema}.pumps (tenant_id, station_id, name)
     VALUES ($1, $2, 'Pump 1')
     ON CONFLICT (station_id, name) DO UPDATE SET name=EXCLUDED.name
     RETURNING id`,
    [tenantId, stationId]
  );
  const pumpId = pumpRows[0].id;

  // nozzles
  await client.query(
    `INSERT INTO ${schema}.nozzles (tenant_id, pump_id, nozzle_number, fuel_type)
     VALUES ($1, $2, 1, 'petrol')
     ON CONFLICT (pump_id, nozzle_number) DO NOTHING`,
    [tenantId, pumpId]
  );
  await client.query(
    `INSERT INTO ${schema}.nozzles (tenant_id, pump_id, nozzle_number, fuel_type)
     VALUES ($1, $2, 2, 'diesel')
     ON CONFLICT (pump_id, nozzle_number) DO NOTHING`,
    [tenantId, pumpId]
  );

  // optional fuel price
  await client.query(
    `INSERT INTO ${schema}.fuel_prices (tenant_id, station_id, price, effective_from)
     VALUES ($1, $2, 100, NOW())
     ON CONFLICT (station_id, effective_from) DO NOTHING`,
    [tenantId, stationId]
  );

  console.log(`Seeded tenant '${schema}' with 3 users, 1 station, 1 pump, 2 nozzles.`);

  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
