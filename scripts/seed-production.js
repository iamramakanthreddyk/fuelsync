const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function seedProductionData() {
  console.log('Starting production seed...');
  
  // Load .env file if exists
  try {
    require('dotenv').config();
  } catch (e) {
    console.log('dotenv not available, using environment variables');
  }

  // Log DB connection parameters
  console.log('DB Connection Parameters:');
  console.log('- Host:', process.env.DB_HOST || 'localhost');
  console.log('- Database:', process.env.DB_NAME || 'fuelsync_db');
  console.log('- User:', process.env.DB_USER || 'postgres');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fuelsync_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: { rejectUnauthorized: false } // Force SSL with no verification
  });

  try {
    console.log('Connected to database');
    
    // Drop existing schemas
    await pool.query('DROP SCHEMA IF EXISTS production_tenant CASCADE');
    await pool.query('DROP SCHEMA IF EXISTS demo_tenant_001 CASCADE');
    
    // Drop existing tables
    await pool.query('DROP TABLE IF EXISTS public.tenants CASCADE');
    await pool.query('DROP TABLE IF EXISTS public.plans CASCADE');
    await pool.query('DROP TABLE IF EXISTS public.admin_users CASCADE');
    
    console.log('Dropped existing schemas and tables');
    
    // Create public tables
    await pool.query(`
      CREATE TABLE public.plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        max_stations INTEGER NOT NULL DEFAULT 5,
        max_pumps_per_station INTEGER NOT NULL DEFAULT 10,
        max_nozzles_per_pump INTEGER NOT NULL DEFAULT 4,
        price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
        features JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE public.tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        schema_name TEXT NOT NULL UNIQUE,
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
    
    console.log('Created public tables');
    
    // Create production tenant schema
    await pool.query('CREATE SCHEMA production_tenant');
    
    // Create tenant tables
    await pool.query(`
      CREATE TABLE production_tenant.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'attendant')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE production_tenant.stations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name TEXT NOT NULL,
        address TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE production_tenant.pumps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        station_id UUID NOT NULL REFERENCES production_tenant.stations(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        serial_number VARCHAR(100),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE production_tenant.nozzles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        pump_id UUID NOT NULL REFERENCES production_tenant.pumps(id) ON DELETE CASCADE,
        nozzle_number INTEGER NOT NULL,
        fuel_type TEXT NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'premium')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE production_tenant.fuel_prices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        station_id UUID NOT NULL REFERENCES production_tenant.stations(id) ON DELETE CASCADE,
        fuel_type TEXT NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'premium')),
        price DECIMAL(10,2) NOT NULL CHECK (price > 0),
        cost_price DECIMAL(10,2) DEFAULT 0,
        valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE production_tenant.creditors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        station_id UUID REFERENCES production_tenant.stations(id),
        party_name TEXT NOT NULL,
        contact_number TEXT,
        address TEXT,
        credit_limit DECIMAL(10,2) DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE production_tenant.nozzle_readings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        nozzle_id UUID NOT NULL REFERENCES production_tenant.nozzles(id) ON DELETE CASCADE,
        station_id UUID NOT NULL REFERENCES production_tenant.stations(id),
        reading DECIMAL(10,3) NOT NULL CHECK (reading >= 0),
        recorded_at TIMESTAMPTZ NOT NULL,
        payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'upi', 'credit')),
        creditor_id UUID REFERENCES production_tenant.creditors(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE production_tenant.sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        nozzle_id UUID NOT NULL REFERENCES production_tenant.nozzles(id),
        station_id UUID NOT NULL REFERENCES production_tenant.stations(id),
        volume DECIMAL(10,3) NOT NULL CHECK (volume >= 0),
        fuel_type TEXT NOT NULL,
        fuel_price DECIMAL(10,2) NOT NULL,
        cost_price DECIMAL(10,2) DEFAULT 0,
        amount DECIMAL(10,2) NOT NULL,
        profit DECIMAL(10,2) DEFAULT 0,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'credit')),
        creditor_id UUID REFERENCES production_tenant.creditors(id),
        created_by UUID REFERENCES production_tenant.users(id),
        status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted')),
        recorded_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE production_tenant.credit_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        creditor_id UUID NOT NULL REFERENCES production_tenant.creditors(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'check')),
        reference_number TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE production_tenant.fuel_inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        station_id UUID NOT NULL REFERENCES production_tenant.stations(id),
        fuel_type TEXT NOT NULL,
        current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
        minimum_level DECIMAL(10,3) NOT NULL DEFAULT 1000,
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE production_tenant.alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        station_id UUID REFERENCES production_tenant.stations(id),
        alert_type TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE production_tenant.fuel_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        station_id UUID NOT NULL REFERENCES production_tenant.stations(id),
        fuel_type TEXT NOT NULL,
        volume DECIMAL(10,3) NOT NULL CHECK (volume > 0),
        delivered_by TEXT,
        delivery_date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('Created tenant tables');
    
    // Insert seed data
    const adminHash = await bcrypt.hash('admin123', 10);
    
    // Insert plan
    const planResult = await pool.query(`
      INSERT INTO public.plans (name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, features)
      VALUES ('Basic Plan', 10, 20, 6, 99.99, '["Station Management", "Fuel Price Tracking", "Sales Reports", "Credit Management"]')
      RETURNING id
    `);
    const planId = planResult.rows[0].id;
    
    // Insert tenant
    const tenantResult = await pool.query(`
      INSERT INTO public.tenants (name, schema_name, plan_id)
      VALUES ('FuelSync Production', 'production_tenant', $1)
      RETURNING id
    `, [planId]);
    const tenantId = tenantResult.rows[0].id;
    
    // Insert admin user
    await pool.query(`
      INSERT INTO public.admin_users (email, password_hash, role)
      VALUES ('admin@fuelsync.com', $1, 'superadmin')
    `, [adminHash]);
    
    // Insert tenant users
    const ownerResult = await pool.query(`
      INSERT INTO production_tenant.users (tenant_id, email, password_hash, name, role)
      VALUES ($1, 'owner@fuelsync.com', $2, 'Station Owner', 'owner')
      RETURNING id
    `, [tenantId, adminHash]);
    const ownerId = ownerResult.rows[0].id;
    
    await pool.query(`
      INSERT INTO production_tenant.users (tenant_id, email, password_hash, name, role)
      VALUES ($1, 'manager@fuelsync.com', $2, 'Station Manager', 'manager')
    `, [tenantId, adminHash]);
    
    await pool.query(`
      INSERT INTO production_tenant.users (tenant_id, email, password_hash, name, role)
      VALUES ($1, 'attendant@fuelsync.com', $2, 'Pump Attendant', 'attendant')
    `, [tenantId, adminHash]);
    
    console.log('Inserted users');
    
    // Insert stations
    const station1Result = await pool.query(`
      INSERT INTO production_tenant.stations (tenant_id, name, address)
      VALUES ($1, 'Main Station', '123 Highway Road, Downtown')
      RETURNING id
    `, [tenantId]);
    const station1Id = station1Result.rows[0].id;
    
    const station2Result = await pool.query(`
      INSERT INTO production_tenant.stations (tenant_id, name, address)
      VALUES ($1, 'North Branch', '456 North Street, Uptown')
      RETURNING id
    `, [tenantId]);
    const station2Id = station2Result.rows[0].id;
    
    const station3Result = await pool.query(`
      INSERT INTO production_tenant.stations (tenant_id, name, address)
      VALUES ($1, 'East Plaza', '789 East Avenue, Eastside')
      RETURNING id
    `, [tenantId]);
    const station3Id = station3Result.rows[0].id;
    
    console.log('Inserted stations');
    
    // Insert pumps for each station
    const pumps = [];
    
    // Main Station - 10 pumps
    for (let i = 1; i <= 10; i++) {
      const pumpResult = await pool.query(`
        INSERT INTO production_tenant.pumps (tenant_id, station_id, label, serial_number)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [tenantId, station1Id, `Pump ${i}`, `MS-P${i.toString().padStart(3, '0')}-2024`]);
      pumps.push({ id: pumpResult.rows[0].id, station: station1Id, label: `Pump ${i}` });
    }
    
    // North Branch - 8 pumps
    for (let i = 1; i <= 8; i++) {
      const pumpResult = await pool.query(`
        INSERT INTO production_tenant.pumps (tenant_id, station_id, label, serial_number)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [tenantId, station2Id, `Pump ${i}`, `NB-P${i.toString().padStart(3, '0')}-2024`]);
      pumps.push({ id: pumpResult.rows[0].id, station: station2Id, label: `Pump ${i}` });
    }
    
    // East Plaza - 8 pumps
    for (let i = 1; i <= 8; i++) {
      const pumpResult = await pool.query(`
        INSERT INTO production_tenant.pumps (tenant_id, station_id, label, serial_number)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [tenantId, station3Id, `Pump ${i}`, `EP-P${i.toString().padStart(3, '0')}-2024`]);
      pumps.push({ id: pumpResult.rows[0].id, station: station3Id, label: `Pump ${i}` });
    }
    
    console.log('Inserted pumps');
    
    // Insert nozzles for all pumps
    const nozzles = [];
    const fuelTypes = ['petrol', 'diesel', 'premium'];
    
    for (const pump of pumps) {
      // Each pump gets 2 nozzles with different fuel types
      const nozzle1Result = await pool.query(`
        INSERT INTO production_tenant.nozzles (tenant_id, pump_id, nozzle_number, fuel_type)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [tenantId, pump.id, 1, fuelTypes[0]]);
      
      const nozzle2Result = await pool.query(`
        INSERT INTO production_tenant.nozzles (tenant_id, pump_id, nozzle_number, fuel_type)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [tenantId, pump.id, 2, fuelTypes[Math.floor(Math.random() * 3)]]);
      
      nozzles.push({ id: nozzle1Result.rows[0].id, pump: pump.id, station: pump.station, fuel: fuelTypes[0] });
      nozzles.push({ id: nozzle2Result.rows[0].id, pump: pump.id, station: pump.station, fuel: fuelTypes[Math.floor(Math.random() * 3)] });
    }
    
    console.log('Inserted nozzles');
    
    // Insert fuel prices
    const stations = [station1Id, station2Id, station3Id];
    const prices = {
      petrol: { sell: [95.50, 94.80, 96.20], cost: [85.00, 84.50, 85.50] },
      diesel: { sell: [87.25, 86.90, 88.10], cost: [78.00, 77.80, 78.50] },
      premium: { sell: [105.75, 104.90, 106.50], cost: [95.00, 94.50, 95.80] }
    };
    
    for (let i = 0; i < stations.length; i++) {
      await pool.query(`
        INSERT INTO production_tenant.fuel_prices (tenant_id, station_id, fuel_type, price, cost_price)
        VALUES ($1, $2, $3, $4, $5)
      `, [tenantId, stations[i], 'petrol', prices.petrol.sell[i], prices.petrol.cost[i]]);
      
      await pool.query(`
        INSERT INTO production_tenant.fuel_prices (tenant_id, station_id, fuel_type, price, cost_price)
        VALUES ($1, $2, $3, $4, $5)
      `, [tenantId, stations[i], 'diesel', prices.diesel.sell[i], prices.diesel.cost[i]]);
      
      await pool.query(`
        INSERT INTO production_tenant.fuel_prices (tenant_id, station_id, fuel_type, price, cost_price)
        VALUES ($1, $2, $3, $4, $5)
      `, [tenantId, stations[i], 'premium', prices.premium.sell[i], prices.premium.cost[i]]);
      
      // Insert inventory data
      await pool.query(`
        INSERT INTO production_tenant.fuel_inventory (tenant_id, station_id, fuel_type, current_stock, minimum_level)
        VALUES ($1, $2, $3, $4, $5)
      `, [tenantId, stations[i], 'petrol', 5000 + Math.random() * 3000, 1000]);
      
      await pool.query(`
        INSERT INTO production_tenant.fuel_inventory (tenant_id, station_id, fuel_type, current_stock, minimum_level)
        VALUES ($1, $2, $3, $4, $5)
      `, [tenantId, stations[i], 'diesel', 4000 + Math.random() * 2000, 800]);
      
      await pool.query(`
        INSERT INTO production_tenant.fuel_inventory (tenant_id, station_id, fuel_type, current_stock, minimum_level)
        VALUES ($1, $2, $3, $4, $5)
      `, [tenantId, stations[i], 'premium', 2000 + Math.random() * 1000, 500]);
    }
    
    console.log('Inserted fuel prices and inventory');
    
    // Insert creditors
    const creditors = [];
    
    // Main Station creditors
    const creditor1Result = await pool.query(`
      INSERT INTO production_tenant.creditors (tenant_id, station_id, party_name, contact_number, credit_limit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [tenantId, station1Id, 'ABC Transport Co.', '+1234567890', 50000]);
    creditors.push(creditor1Result.rows[0].id);
    
    const creditor2Result = await pool.query(`
      INSERT INTO production_tenant.creditors (tenant_id, station_id, party_name, contact_number, credit_limit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [tenantId, station1Id, 'Downtown Delivery', '+1111222233', 30000]);
    creditors.push(creditor2Result.rows[0].id);
    
    // North Branch creditors
    const creditor3Result = await pool.query(`
      INSERT INTO production_tenant.creditors (tenant_id, station_id, party_name, contact_number, credit_limit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [tenantId, station2Id, 'XYZ Logistics Ltd.', '+0987654321', 25000]);
    creditors.push(creditor3Result.rows[0].id);
    
    const creditor4Result = await pool.query(`
      INSERT INTO production_tenant.creditors (tenant_id, station_id, party_name, contact_number, credit_limit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [tenantId, station2Id, 'North Taxi Service', '+2222333344', 15000]);
    creditors.push(creditor4Result.rows[0].id);
    
    // East Plaza creditors
    const creditor5Result = await pool.query(`
      INSERT INTO production_tenant.creditors (tenant_id, station_id, party_name, contact_number, credit_limit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [tenantId, station3Id, 'City Bus Service', '+1122334455', 75000]);
    creditors.push(creditor5Result.rows[0].id);
    
    const creditor6Result = await pool.query(`
      INSERT INTO production_tenant.creditors (tenant_id, station_id, party_name, contact_number, credit_limit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [tenantId, station3Id, 'East Side Trucks', '+3333444455', 40000]);
    creditors.push(creditor6Result.rows[0].id);
    
    console.log('Inserted creditors');
    
    // Insert nozzle readings and sales
    const paymentMethods = ['cash', 'card', 'upi', 'credit'];
    let readingCount = 0;
    let salesCount = 0;
    
    // Generate readings and sales for the past 30 days
    for (const nozzle of nozzles.slice(0, 20)) {
      const baseReading = Math.floor(Math.random() * 1000) + 500;
      
      for (let day = 30; day >= 0; day--) {
        const reading = baseReading + (30 - day) * (Math.random() * 50 + 10);
        const recordedAt = new Date(Date.now() - day * 86400000 + Math.random() * 86400000);
        const paymentMethod = paymentMethods[Math.floor(Math.random() * 4)];
        const creditorId = paymentMethod === 'credit' ? creditors[Math.floor(Math.random() * creditors.length)] : null;
        
        // Insert reading
        await pool.query(`
          INSERT INTO production_tenant.nozzle_readings (tenant_id, nozzle_id, station_id, reading, recorded_at, payment_method, creditor_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [tenantId, nozzle.id, nozzle.station, reading, recordedAt, paymentMethod, creditorId]);
        readingCount++;
        
        // Insert sales for some readings
        if (day <= 7) {
          const volume = Math.random() * 50 + 10; // 10-60 liters
          const fuelPrice = nozzle.fuel === 'petrol' ? 95.50 : nozzle.fuel === 'diesel' ? 87.25 : 105.75;
          const costPrice = nozzle.fuel === 'petrol' ? 85.00 : nozzle.fuel === 'diesel' ? 78.00 : 95.00;
          const amount = volume * fuelPrice;
          const profit = volume * (fuelPrice - costPrice);
          
          await pool.query(`
            INSERT INTO production_tenant.sales (tenant_id, nozzle_id, station_id, volume, fuel_type, fuel_price, cost_price, amount, profit, payment_method, creditor_id, created_by, recorded_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [tenantId, nozzle.id, nozzle.station, volume, nozzle.fuel, fuelPrice, costPrice, amount, profit, paymentMethod, creditorId, ownerId, recordedAt]);
          salesCount++;
        }
      }
    }
    
    console.log(`Inserted ${readingCount} readings and ${salesCount} sales`);
    
    // Insert credit payments
    let paymentCount = 0;
    for (const creditorId of creditors) {
      const paymentAmount = Math.floor(Math.random() * 10000) + 5000;
      const paymentMethods = ['cash', 'bank_transfer', 'check'];
      const method = paymentMethods[Math.floor(Math.random() * 3)];
      const refNumber = method !== 'cash' ? `REF${Math.floor(Math.random() * 100000)}` : null;
      
      await pool.query(`
        INSERT INTO production_tenant.credit_payments (tenant_id, creditor_id, amount, payment_method, reference_number, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [tenantId, creditorId, paymentAmount, method, refNumber, 'Payment received']);
      paymentCount++;
    }
    
    console.log(`Inserted ${paymentCount} credit payments`);
    
    // Insert fuel deliveries
    for (const station of stations) {
      for (const fuelType of fuelTypes) {
        await pool.query(`
          INSERT INTO production_tenant.fuel_deliveries (tenant_id, station_id, fuel_type, volume, delivered_by, delivery_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenantId, station, fuelType, Math.floor(Math.random() * 5000) + 1000, 'Fuel Supplier Inc.', new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000)]);
      }
    }
    
    console.log('Inserted fuel deliveries');
    
    console.log('Seed completed successfully');
    console.log('Login credentials:');
    console.log('SuperAdmin: admin@fuelsync.com / admin123');
    console.log('Owner: owner@fuelsync.com / admin123');
    console.log('Manager: manager@fuelsync.com / admin123');
    console.log('Attendant: attendant@fuelsync.com / admin123');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

seedProductionData().catch(console.error);