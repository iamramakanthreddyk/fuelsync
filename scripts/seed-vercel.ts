import { sql } from '@vercel/postgres';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function seedVercel() {
  try {
    console.log('🌱 Seeding Vercel database...');
    
    if (!process.env.POSTGRES_URL) {
      console.log('⚠️ No POSTGRES_URL found, skipping seeding');
      return;
    }
    
    // Create plans
    const basicPlanId = randomUUID();
    await sql`INSERT INTO public.plans (id, name, config_json) VALUES (${basicPlanId}, 'basic', '{}') ON CONFLICT (name) DO NOTHING`;
    
    // Create admin user
    const adminHash = await bcrypt.hash('Admin@123!', 10);
    await sql`INSERT INTO public.admin_users (id, email, password_hash, role) VALUES (${randomUUID()}, 'admin@fuelsync.dev', ${adminHash}, 'superadmin') ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`;
    
    // Create tenant
    const tenantId = randomUUID();
    await sql`INSERT INTO public.tenants (id, name, schema_name, plan_id) VALUES (${tenantId}, 'Demo Company', 'demo_tenant_001', ${basicPlanId}) ON CONFLICT (schema_name) DO NOTHING`;
    
    // Create tenant users
    const ownerHash = await bcrypt.hash('Owner@123!', 10);
    await sql`INSERT INTO demo_tenant_001.users (id, tenant_id, email, password_hash, role) VALUES (${randomUUID()}, ${tenantId}, 'owner@demo.com', ${ownerHash}, 'owner') ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`;
    
    console.log('✅ Vercel seeding completed!');
    console.log('🔑 Admin: admin@fuelsync.dev / Admin@123!');
    console.log('🏢 Owner: owner@demo.com / Owner@123!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    console.log('⚠️ Continuing build without seeding');
  }
}

seedVercel();