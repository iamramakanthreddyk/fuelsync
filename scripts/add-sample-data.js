const { Pool } = require('pg');

// Load environment variables
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not available, using environment variables');
}

async function addSampleData() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fuelsync',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Adding sample data...');
    
    // Add sample tenant
    const tenantResult = await pool.query(`
      INSERT INTO public.tenants (id, name, schema_name, status) 
      VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Demo Tenant', 'demo_tenant', 'active')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `);
    
    const tenantId = '550e8400-e29b-41d4-a716-446655440000';
    
    // Add sample station
    await pool.query(`
      INSERT INTO public.stations (id, tenant_id, name, address, status) 
      VALUES ('94c3a42e-d240-452a-8fd5-dcfd051bb895', $1, 'Main Station', '123 Main St', 'active')
      ON CONFLICT (id) DO NOTHING
    `, [tenantId]);
    
    // Add sample pump
    await pool.query(`
      INSERT INTO public.pumps (id, tenant_id, station_id, pump_number, status) 
      VALUES ('pump-001', $1, '94c3a42e-d240-452a-8fd5-dcfd051bb895', 1, 'active')
      ON CONFLICT (id) DO NOTHING
    `, [tenantId]);
    
    // Add sample nozzle
    await pool.query(`
      INSERT INTO public.nozzles (id, tenant_id, pump_id, nozzle_number, fuel_type, status) 
      VALUES ('nozzle-001', $1, 'pump-001', 1, 'petrol', 'active')
      ON CONFLICT (id) DO NOTHING
    `, [tenantId]);
    
    // Add sample fuel price
    await pool.query(`
      INSERT INTO public.fuel_prices (id, tenant_id, station_id, fuel_type, price, valid_from) 
      VALUES ('price-001', $1, '94c3a42e-d240-452a-8fd5-dcfd051bb895', 'petrol', 100.50, '2024-01-01')
      ON CONFLICT (id) DO NOTHING
    `, [tenantId]);
    
    // Add sample nozzle readings
    await pool.query(`
      INSERT INTO public.nozzle_readings (id, tenant_id, nozzle_id, reading, recorded_at, payment_method) 
      VALUES 
        ('reading-001', $1, 'nozzle-001', 1000, '2024-01-15 09:00:00', 'cash'),
        ('reading-002', $1, 'nozzle-001', 1050, '2024-01-15 15:00:00', 'cash')
      ON CONFLICT (id) DO NOTHING
    `, [tenantId]);
    
    // Add sample user
    await pool.query(`
      INSERT INTO public.users (id, tenant_id, name, email, password_hash, role, status) 
      VALUES ('user-001', $1, 'Test Manager', 'manager@test.com', '$2b$10$hash', 'manager', 'active')
      ON CONFLICT (id) DO NOTHING
    `, [tenantId]);
    
    console.log('✅ Sample data added successfully!');
    
  } catch (error) {
    console.error('❌ Failed to add sample data:', error.message);
  } finally {
    await pool.end();
  }
}

addSampleData();