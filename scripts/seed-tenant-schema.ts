import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: envFile });

async function seed() {
  const tenantId = process.env.TENANT_ID || process.argv[2];
  const schemaName = process.env.SCHEMA_NAME || process.argv[3];

  if (!tenantId || !schemaName) {
    console.error('Usage: ts-node seed-tenant-schema.ts <tenantId> <schemaName>');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const templatePath = path.join(__dirname, '../migrations/tenant_schema_template.sql');
  const templateSql = fs.readFileSync(templatePath, 'utf8');
  const migrationSql = templateSql.replace(/{{schema_name}}/g, schemaName);
  await client.query(migrationSql);

  const { rows: userRows } = await client.query(
    `INSERT INTO ${schemaName}.users (tenant_id, email, password_hash, role)
     VALUES ($1, 'owner@' || $2 || '.com', 'demo-hash', 'owner')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [tenantId, schemaName]
  );
  const ownerId = userRows[0]?.id;

  const { rows: stationRows } = await client.query(
    `INSERT INTO ${schemaName}.stations (tenant_id, name)
     VALUES ($1, 'Main Station')
     ON CONFLICT (name) DO NOTHING
     RETURNING id`,
    [tenantId]
  );
  const stationId = stationRows[0]?.id;

  const { rows: pumpRows } = await client.query(
    `INSERT INTO ${schemaName}.pumps (tenant_id, station_id, name)
     VALUES ($1, $2, 'Pump 1')
     ON CONFLICT (station_id, name) DO NOTHING
     RETURNING id`,
    [tenantId, stationId]
  );
  const pumpId = pumpRows[0]?.id;

  await client.query(
    `INSERT INTO ${schemaName}.nozzles (tenant_id, pump_id, name)
     VALUES ($1, $2, 'Nozzle 1')
     ON CONFLICT (pump_id, name) DO NOTHING`,
    [tenantId, pumpId]
  );

  // basic validation
  const { rows } = await client.query(`SELECT COUNT(*) FROM ${schemaName}.stations`);
  console.log(`Seeded tenant schema '${schemaName}'. Stations count:`, rows[0].count);

  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

