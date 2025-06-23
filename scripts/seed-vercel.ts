import { createClient } from '@vercel/postgres';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function seedVercel() {
  try {
    console.log('🌱 Seeding Vercel database...');
    
    if (!process.env.POSTGRES_URL) {
      console.log('⚠️ No POSTGRES_URL found, skipping seeding');
      return;
    }
    
    const client = createClient({
      connectionString: process.env.POSTGRES_URL
    });
    await client.connect();
    
    // Create plans
    const basicPlanId = randomUUID();
    await client.query('INSERT INTO public.plans (id, name, config_json) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING', [basicPlanId, 'basic', '{}']);
    
    // Create admin user
    const adminHash = await bcrypt.hash('Admin@123!', 10);
    await client.query('INSERT INTO public.admin_users (id, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash', [randomUUID(), 'admin@fuelsync.dev', adminHash, 'superadmin']);
    
    // Create tenant
    const tenantId = randomUUID();
    await client.query('INSERT INTO public.tenants (id, name, schema_name, plan_id) VALUES ($1, $2, $3, $4) ON CONFLICT (schema_name) DO NOTHING', [tenantId, 'Demo Company', 'demo_tenant_001', basicPlanId]);
    
    // Create tenant users
    const ownerHash = await bcrypt.hash('Owner@123!', 10);
    await client.query('INSERT INTO demo_tenant_001.users (id, tenant_id, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash', [randomUUID(), tenantId, 'owner@demo.com', ownerHash, 'owner']);
    
    await client.end();
    
    console.log('✅ Vercel seeding completed!');
    console.log('🔑 Admin: admin@fuelsync.dev / Admin@123!');
    console.log('🏢 Owner: owner@demo.com / Owner@123!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    console.log('⚠️ Continuing build without seeding');
  }
}

seedVercel();