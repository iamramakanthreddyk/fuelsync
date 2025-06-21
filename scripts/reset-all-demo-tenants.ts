import { Client } from 'pg';
import { spawnSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function reset() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query(
    `SELECT schema_name FROM public.tenants WHERE schema_name LIKE 'demo_%'`
  );
  const schemas = rows.map((r) => r.schema_name);

  for (const schema of schemas) {
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await client.query(`DELETE FROM public.tenants WHERE schema_name=$1`, [schema]);
    console.log(`Dropped schema ${schema}`);
  }

  await client.end();

  const seedScript = path.join(__dirname, 'seed-demo-tenant.ts');
  const validateScript = path.join(__dirname, 'validate-demo-tenant.ts');
  const names = schemas.length ? schemas : ['demo_tenant_001'];
  for (const name of names) {
    const res = spawnSync('ts-node', [seedScript, name], { stdio: 'inherit' });
    if (res.status !== 0) {
      process.exit(res.status || 1);
    }
    const val = spawnSync('ts-node', [validateScript, name], { stdio: 'inherit' });
    if (val.status !== 0) {
      process.exit(val.status || 1);
    }
  }
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});
