const { Pool } = require('pg');

// Database connection
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fuelsync',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function fixTenantPlan() {
  const tenantId = '681ac774-7a8f-428c-a008-2ac9aca76fc0';
  const proPlanId = '00000000-0000-0000-0000-000000000002';
  
  try {
    console.log('🔍 Checking current tenant plan...');
    
    // Check current plan
    const currentResult = await db.query(
      'SELECT t.name, t.plan_id, p.name as plan_name FROM public.tenants t LEFT JOIN public.plans p ON t.plan_id = p.id WHERE t.id = $1',
      [tenantId]
    );
    
    if (currentResult.rows.length === 0) {
      console.log('❌ Tenant not found');
      return;
    }
    
    const tenant = currentResult.rows[0];
    console.log('Current tenant:', {
      name: tenant.name,
      planId: tenant.plan_id,
      planName: tenant.plan_name
    });
    
    // Check if pro plan exists
    const proPlanResult = await db.query(
      'SELECT id, name, max_stations FROM public.plans WHERE id = $1',
      [proPlanId]
    );
    
    if (proPlanResult.rows.length === 0) {
      console.log('❌ Pro plan not found, creating it...');
      
      // Create pro plan
      await db.query(
        `INSERT INTO public.plans (id, name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, price_yearly, features, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          proPlanId,
          'pro',
          3,
          4,
          4,
          29.99,
          299.99,
          JSON.stringify(['creditors', 'reports'])
        ]
      );
      console.log('✅ Pro plan created');
    } else {
      console.log('✅ Pro plan exists:', proPlanResult.rows[0]);
    }
    
    // Update tenant plan
    console.log('🔄 Updating tenant plan to pro...');
    await db.query(
      'UPDATE public.tenants SET plan_id = $1, updated_at = NOW() WHERE id = $2',
      [proPlanId, tenantId]
    );
    
    // Verify update
    const updatedResult = await db.query(
      'SELECT t.name, t.plan_id, p.name as plan_name, p.max_stations FROM public.tenants t LEFT JOIN public.plans p ON t.plan_id = p.id WHERE t.id = $1',
      [tenantId]
    );
    
    const updatedTenant = updatedResult.rows[0];
    console.log('✅ Tenant plan updated:', {
      name: updatedTenant.name,
      planId: updatedTenant.plan_id,
      planName: updatedTenant.plan_name,
      maxStations: updatedTenant.max_stations
    });
    
    console.log('🎉 Tenant can now create up to 3 stations!');
    
  } catch (error) {
    console.error('❌ Error fixing tenant plan:', error);
  } finally {
    await db.end();
  }
}

fixTenantPlan();