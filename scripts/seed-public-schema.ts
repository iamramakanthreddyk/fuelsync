import { Client } from 'pg';
import dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: envFile });

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Insert demo plans
  await client.query(
    `INSERT INTO public.plans (name, config_json)
     VALUES ('basic', '{}'::jsonb),
            ('pro', '{}'::jsonb)
     ON CONFLICT (name) DO NOTHING`
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
     ON CONFLICT (email) DO UPDATE SET email=EXCLUDED.email
     RETURNING id`,
    ['admin@fuelsync.dev', 'password-hash']
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
