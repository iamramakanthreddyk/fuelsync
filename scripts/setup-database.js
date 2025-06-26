const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function setupDatabase() {
  console.log('Starting complete database setup...');
  
  try {
    require('dotenv').config();
  } catch (e) {
    console.log('dotenv not available, using environment variables');
  }
  
  // Connection parameters
  console.log('DB Connection Parameters:');
  console.log('- Host:', process.env.DB_HOST || 'localhost');
  console.log('- Database:', process.env.DB_NAME || 'fuelsync_db');
  console.log('- User:', process.env.DB_USER || 'postgres');
  
  // Azure PostgreSQL connection
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false } // Required for Azure PostgreSQL
  });

  try {
    console.log('Connected to database');
    
    // STEP 1: Create base schema
    console.log('\n=== STEP 1: Creating base schema ===');
    
    // Drop existing schemas if needed
    console.log('Dropping existing schemas and tables...');
    await pool.query('DROP TABLE IF EXISTS public.tenants CASCADE');
    await pool.query('DROP TABLE IF EXISTS public.plans CASCADE');
    await pool.query('DROP TABLE IF EXISTS public.admin_users CASCADE');
    await pool.query('DROP TABLE IF EXISTS public.schema_migrations CASCADE');
    
    // Create public schema tables
    console.log('Creating public schema tables...');
    await pool.query(`
      CREATE TABLE public.schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        rollback_sql TEXT
      );
      
      CREATE TABLE public.plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        max_stations INTEGER NOT NULL DEFAULT 5,
        max_pumps_per_station INTEGER NOT NULL DEFAULT 10,
        max_nozzles_per_pump INTEGER NOT NULL DEFAULT 4,
        price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
        features JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE public.tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        plan_id UUID REFERENCES public.plans(id),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE public.admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'superadmin',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    // STEP 2: Create plans
    console.log('\n=== STEP 2: Creating subscription plans ===');
    
    // Create Basic Plan
    const basicPlanResult = await pool.query(`
      INSERT INTO public.plans (name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, price_yearly, features)
      VALUES ('Basic Plan', 5, 10, 4, 49.99, 499.99, '["Station Management", "Sales Tracking", "Basic Reports"]')
      RETURNING id
    `);
    const basicPlanId = basicPlanResult.rows[0].id;
    console.log('Created Basic Plan:', basicPlanId);
    
    // Create Pro Plan
    const proPlanResult = await pool.query(`
      INSERT INTO public.plans (name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, price_yearly, features)
      VALUES ('Pro Plan', 15, 20, 6, 99.99, 999.99, '["Station Management", "Sales Tracking", "Advanced Reports", "API Access", "Multi-User Access"]')
      RETURNING id
    `);
    const proPlanId = proPlanResult.rows[0].id;
    console.log('Created Pro Plan:', proPlanId);
    
    // Create Enterprise Plan
    const enterprisePlanResult = await pool.query(`
      INSERT INTO public.plans (name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, price_yearly, features)
      VALUES ('Enterprise Plan', 50, 30, 8, 199.99, 1999.99, '["Station Management", "Sales Tracking", "Advanced Reports", "API Access", "Multi-User Access", "Priority Support", "Custom Branding", "Data Export"]')
      RETURNING id
    `);
    const enterprisePlanId = enterprisePlanResult.rows[0].id;
    console.log('Created Enterprise Plan:', enterprisePlanId);
    
    // STEP 3: Create admin users
    console.log('\n=== STEP 3: Creating admin users ===');
    
    const adminHash = await bcrypt.hash('admin123', 10);
    
    // Create main admin
    await pool.query(`
      INSERT INTO public.admin_users (email, password_hash, role)
      VALUES ('admin@fuelsync.com', $1, 'superadmin')
    `, [adminHash]);
    console.log('Created SuperAdmin: admin@fuelsync.com');
    
    // Create additional admins
    await pool.query(`
      INSERT INTO public.admin_users (email, password_hash, role)
      VALUES ('admin2@fuelsync.com', $1, 'superadmin')
    `, [adminHash]);
    console.log('Created SuperAdmin: admin2@fuelsync.com');
    
    await pool.query(`
      INSERT INTO public.admin_users (email, password_hash, role)
      VALUES ('support@fuelsync.com', $1, 'admin')
    `, [adminHash]);
    console.log('Created Admin: support@fuelsync.com');
    
    // STEP 4: Create tenants
    console.log("\n=== STEP 4: Creating tenants ===");
    
    
    // Create Production Tenant
    const productionTenantResult = await pool.query(`
      INSERT INTO public.tenants (name, plan_id, status)
      VALUES ('FuelSync Production', $1, 'active')
      RETURNING id
    `, [enterprisePlanId]);
    const productionTenantId = productionTenantResult.rows[0].id;
    console.log('Created Production Tenant:', productionTenantId);
    
    
    // Create Test Tenant 1
    const testTenant1Result = await pool.query(`
      INSERT INTO public.tenants (name, plan_id, status)
      VALUES ('Test Tenant 1', $1, 'active')
      RETURNING id
    `, [basicPlanId]);
    const testTenant1Id = testTenant1Result.rows[0].id;
    console.log('Created Test Tenant 1:', testTenant1Id);
    
    
    // Create Test Tenant 2
    const testTenant2Result = await pool.query(`
      INSERT INTO public.tenants (name, plan_id, status)
      VALUES ('Test Tenant 2', $1, 'active')
      RETURNING id
    `, [proPlanId]);
    const testTenant2Id = testTenant2Result.rows[0].id;
    console.log('Created Test Tenant 2:', testTenant2Id);
    
    
    // Create Test Tenant 3 (suspended)
    const testTenant3Result = await pool.query(`
      INSERT INTO public.tenants (name, plan_id, status)
      VALUES ('Test Tenant 3', $1, 'suspended')
      RETURNING id
    `, [enterprisePlanId]);
    const testTenant3Id = testTenant3Result.rows[0].id;
    console.log('Created Test Tenant 3:', testTenant3Id);
    
    
    // STEP 5: Create tenant users and data
    console.log('\n=== STEP 5: Creating tenant users and data ===');
    
    const tenants = [
      { id: productionTenantId, slug: "production-tenant", name: "FuelSync Production" },
      { id: testTenant1Id, slug: "test-tenant-1", name: "Test Tenant 1" },
      { id: testTenant2Id, slug: "test-tenant-2", name: "Test Tenant 2" },
      { id: testTenant3Id, slug: "test-tenant-3", name: "Test Tenant 3" }
    ];
    
    for (const tenant of tenants) {
      console.log(`\nCreating data for tenant: ${tenant.name}`);
      
      // Create users
      const userHash = await bcrypt.hash('admin123', 10);
      
      // Create owner with domain-friendly email
      const emailPrefix = tenant.slug;
      await pool.query(`
        INSERT INTO public.users (tenant_id, email, password_hash, name, role)
        VALUES ($1, $2, $3, $4, 'owner')
      `, [tenant.id, `owner@${emailPrefix}.com`, userHash, `${tenant.name} Owner`]);
      console.log(`Created Owner: owner@${emailPrefix}.com`);
      
      // Create manager with domain-friendly email
      await pool.query(`
        INSERT INTO public.users (tenant_id, email, password_hash, name, role)
        VALUES ($1, $2, $3, $4, 'manager')
      `, [tenant.id, `manager@${emailPrefix}.com`, userHash, `${tenant.name} Manager`]);
      console.log(`Created Manager: manager@${emailPrefix}.com`);
      
      // Create attendant with domain-friendly email
      await pool.query(`
        INSERT INTO public.users (tenant_id, email, password_hash, name, role)
        VALUES ($1, $2, $3, $4, 'attendant')
      `, [tenant.id, `attendant@${emailPrefix}.com`, userHash, `${tenant.name} Attendant`]);
      console.log(`Created Attendant: attendant@${emailPrefix}.com`);
      
      // Create stations
      const station1Result = await pool.query(`
        INSERT INTO public.stations (tenant_id, name, address, status)
        VALUES ($1, 'Main Station', '123 Main St, Downtown', 'active')
        RETURNING id
      `, [tenant.id]);
      const station1Id = station1Result.rows[0].id;
      
      const station2Result = await pool.query(`
        INSERT INTO public.stations (tenant_id, name, address, status)
        VALUES ($1, 'North Branch', '456 North Ave, Uptown', 'active')
        RETURNING id
      `, [tenant.id]);
      const station2Id = station2Result.rows[0].id;
      
      const station3Result = await pool.query(`
        INSERT INTO public.stations (tenant_id, name, address, status)
        VALUES ($1, 'East Plaza', '789 East Blvd, Eastside', 'active')
        RETURNING id
      `, [tenant.id]);
      const station3Id = station3Result.rows[0].id;
      
      console.log(`Created 3 stations for tenant: ${tenant.name}`);
      
      // Create pumps for each station
      const pumps = [];
      
      // Main Station - 4 pumps
      for (let i = 1; i <= 4; i++) {
        const pumpResult = await pool.query(`
          INSERT INTO public.pumps (tenant_id, station_id, label, serial_number, status)
          VALUES ($1, $2, $3, $4, 'active')
          RETURNING id
        `, [tenant.id, station1Id, `Pump ${i}`, `MS-P${i.toString().padStart(3, '0')}-2024`]);
        pumps.push({ id: pumpResult.rows[0].id, station: station1Id });
      }
      
      // North Branch - 3 pumps
      for (let i = 1; i <= 3; i++) {
        const pumpResult = await pool.query(`
          INSERT INTO public.pumps (tenant_id, station_id, label, serial_number, status)
          VALUES ($1, $2, $3, $4, 'active')
          RETURNING id
        `, [tenant.id, station2Id, `Pump ${i}`, `NB-P${i.toString().padStart(3, '0')}-2024`]);
        pumps.push({ id: pumpResult.rows[0].id, station: station2Id });
      }
      
      // East Plaza - 3 pumps
      for (let i = 1; i <= 3; i++) {
        const pumpResult = await pool.query(`
          INSERT INTO public.pumps (tenant_id, station_id, label, serial_number, status)
          VALUES ($1, $2, $3, $4, 'active')
          RETURNING id
        `, [tenant.id, station3Id, `Pump ${i}`, `EP-P${i.toString().padStart(3, '0')}-2024`]);
        pumps.push({ id: pumpResult.rows[0].id, station: station3Id });
      }
      
      console.log(`Created ${pumps.length} pumps for tenant: ${tenant.name}`);
      
      // Create nozzles for each pump
      const nozzles = [];
      const fuelTypes = ['petrol', 'diesel', 'premium'];
      
      for (const pump of pumps) {
        // Each pump gets 2 nozzles
        const nozzle1Result = await pool.query(`
          INSERT INTO public.nozzles (tenant_id, pump_id, nozzle_number, fuel_type, status)
          VALUES ($1, $2, 1, $3, 'active')
          RETURNING id
        `, [tenant.id, pump.id, fuelTypes[0]]);
        nozzles.push({ id: nozzle1Result.rows[0].id, pump: pump.id, station: pump.station, fuel: fuelTypes[0] });
        
        const nozzle2Result = await pool.query(`
          INSERT INTO public.nozzles (tenant_id, pump_id, nozzle_number, fuel_type, status)
          VALUES ($1, $2, 2, $3, 'active')
          RETURNING id
        `, [tenant.id, pump.id, fuelTypes[Math.floor(Math.random() * 3)]]);
        nozzles.push({ id: nozzle2Result.rows[0].id, pump: pump.id, station: pump.station, fuel: fuelTypes[Math.floor(Math.random() * 3)] });
      }
      
      console.log(`Created ${nozzles.length} nozzles for tenant: ${tenant.name}`);
      
      // Create fuel prices
      const stations = [station1Id, station2Id, station3Id];
      const prices = {
        petrol: { sell: [95.50, 94.80, 96.20], cost: [85.00, 84.50, 85.50] },
        diesel: { sell: [87.25, 86.90, 88.10], cost: [78.00, 77.80, 78.50] },
        premium: { sell: [105.75, 104.90, 106.50], cost: [95.00, 94.50, 95.80] }
      };
      
      for (let i = 0; i < stations.length; i++) {
        await pool.query(`
          INSERT INTO public.fuel_prices (tenant_id, station_id, fuel_type, price, cost_price)
          VALUES ($1, $2, $3, $4, $5)
        `, [tenant.id, stations[i], 'petrol', prices.petrol.sell[i], prices.petrol.cost[i]]);
        
        await pool.query(`
          INSERT INTO public.fuel_prices (tenant_id, station_id, fuel_type, price, cost_price)
          VALUES ($1, $2, $3, $4, $5)
        `, [tenant.id, stations[i], 'diesel', prices.diesel.sell[i], prices.diesel.cost[i]]);
        
        await pool.query(`
          INSERT INTO public.fuel_prices (tenant_id, station_id, fuel_type, price, cost_price)
          VALUES ($1, $2, $3, $4, $5)
        `, [tenant.id, stations[i], 'premium', prices.premium.sell[i], prices.premium.cost[i]]);
        
        // Create inventory
        await pool.query(`
          INSERT INTO public.fuel_inventory (tenant_id, station_id, fuel_type, current_stock, minimum_level)
          VALUES ($1, $2, $3, $4, $5)
        `, [tenant.id, stations[i], 'petrol', 5000 + Math.random() * 3000, 1000]);
        
        await pool.query(`
          INSERT INTO public.fuel_inventory (tenant_id, station_id, fuel_type, current_stock, minimum_level)
          VALUES ($1, $2, $3, $4, $5)
        `, [tenant.id, stations[i], 'diesel', 4000 + Math.random() * 2000, 800]);
        
        await pool.query(`
          INSERT INTO public.fuel_inventory (tenant_id, station_id, fuel_type, current_stock, minimum_level)
          VALUES ($1, $2, $3, $4, $5)
        `, [tenant.id, stations[i], 'premium', 2000 + Math.random() * 1000, 500]);
      }
      
      console.log(`Created fuel prices and inventory for tenant: ${tenant.name}`);
      
      // Only create sales data for production tenant
      if (tenant.slug === 'production-tenant') {
        console.log('Creating sales data for production tenant...');
        
        // Create creditors
        const creditors = [];
        
        // Main Station creditors
        const creditor1Result = await pool.query(`
          INSERT INTO public.creditors (tenant_id, station_id, party_name, contact_number, credit_limit)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [tenant.id, station1Id, 'ABC Transport Co.', '+1234567890', 50000]);
        creditors.push(creditor1Result.rows[0].id);
        
        const creditor2Result = await pool.query(`
          INSERT INTO public.creditors (tenant_id, station_id, party_name, contact_number, credit_limit)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [tenant.id, station1Id, 'Downtown Delivery', '+1111222233', 30000]);
        creditors.push(creditor2Result.rows[0].id);
        
        // Create sales data
        const ownerResult = await pool.query(`
          SELECT id FROM public.users WHERE role = 'owner' LIMIT 1
        `);
        const ownerId = ownerResult.rows[0].id;
        
        const paymentMethods = ['cash', 'card', 'upi', 'credit'];
        let salesCount = 0;
        
        // Create sales for the last 7 days
        for (const nozzle of nozzles.slice(0, 10)) {
          for (let day = 7; day >= 0; day--) {
            const volume = Math.random() * 50 + 10; // 10-60 liters
            const fuelPrice = nozzle.fuel === 'petrol' ? 95.50 : nozzle.fuel === 'diesel' ? 87.25 : 105.75;
            const costPrice = nozzle.fuel === 'petrol' ? 85.00 : nozzle.fuel === 'diesel' ? 78.00 : 95.00;
            const amount = volume * fuelPrice;
            const profit = volume * (fuelPrice - costPrice);
            const recordedAt = new Date(Date.now() - day * 86400000 + Math.random() * 86400000);
            const paymentMethod = paymentMethods[Math.floor(Math.random() * 4)];
            const creditorId = paymentMethod === 'credit' ? creditors[Math.floor(Math.random() * creditors.length)] : null;
            
            await pool.query(`
              INSERT INTO public.sales (
                tenant_id, nozzle_id, station_id, volume, fuel_type, 
                fuel_price, cost_price, amount, profit, payment_method, 
                creditor_id, created_by, status, recorded_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `, [
              tenant.id, nozzle.id, nozzle.station, volume, nozzle.fuel,
              fuelPrice, costPrice, amount, profit, paymentMethod,
              creditorId, ownerId, 'posted', recordedAt
            ]);
            salesCount++;
          }
        }
        
        console.log(`Created ${salesCount} sales records for production tenant`);
      }
    }
    
    console.log('\n=== Database setup completed successfully ===');
    console.log('\nLogin credentials:');
    console.log('SuperAdmin: admin@fuelsync.com / admin123');
    console.log('SuperAdmin: admin2@fuelsync.com / admin123');
    console.log('Admin: support@fuelsync.com / admin123');
    console.log('\nTenant credentials:');
    console.log('Owner: owner@production-tenant.com / admin123');
    console.log('Manager: manager@production-tenant.com / admin123');
    console.log('Attendant: attendant@production-tenant.com / admin123');
    
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase().catch(console.error);