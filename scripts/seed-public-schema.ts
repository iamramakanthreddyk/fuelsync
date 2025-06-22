import { Client } from 'pg';
import dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: envFile });

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Insert demo plans if they don't exist
  await client.query(
    `INSERT INTO public.plans (name, config_json)
     SELECT v.name, v.config_json
     FROM (VALUES ('basic', '{}'::jsonb), ('pro', '{}'::jsonb)) AS v(name, config_json)
     WHERE NOT EXISTS (
       SELECT 1 FROM public.plans p WHERE p.name = v.name
     )`
  );

  // Fetch the basic plan id
  const { rows: planRows } = await client.query(
    `SELECT id FROM public.plans WHERE name='basic' LIMIT 1`
  );
  const basicPlanId = planRows[0].id;

  // Insert admin user
  const { rows: adminRows } = await client.query(
    `INSERT INTO public.admin_users (email, password_hash, role)
     VALUES ($1, $2, 'superadmin')
     ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash
     RETURNING id`,
    ['admin@fuelsync.dev', '$2b$10$YgD8wAh23oIWsdQ2Z/aMFOgEGxy9MO4i/nDYg9tw3FGnVlHQfDJ2m']
  );
  const adminId = adminRows[0].id;

  // Insert demo tenant
  await client.query(
    `INSERT INTO public.tenants (name, schema_name, plan_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (schema_name) DO NOTHING`,
    ['Acme Fuels', 'acme_fuels', basicPlanId]
  );

  await client.end();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
