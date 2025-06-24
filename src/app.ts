import express from 'express';
import cors from 'cors';
import pool from './utils/db';
import { createAuthRouter } from './routes/auth.route';
import { createAdminApiRouter } from './routes/adminApi.router';
import { createUserRouter } from './routes/user.route';
import { createStationRouter } from './routes/station.route';
import { createPumpRouter } from './routes/pump.route';
import { createNozzleRouter } from './routes/nozzle.route';
import { createNozzleReadingRouter } from './routes/nozzleReading.route';
import { createFuelPriceRouter } from './routes/fuelPrice.route';
import { createCreditorRouter } from './routes/creditor.route';
import { createCreditPaymentRouter } from './routes/creditPayment.route';
import { createDeliveryRouter } from './routes/delivery.route';
import { createReconciliationRouter } from './routes/reconciliation.route';
import { createSalesRouter } from './routes/sales.route';
import { createSettingsRouter } from './routes/settings.route';
import { createFuelInventoryRouter } from './routes/fuelInventory.route';
import { createTenantRouter } from './routes/tenant.route';
import { createDashboardRouter } from './routes/dashboard.route';
import { createInventoryRouter } from './routes/inventory.route';
import { createReportsRouter } from './routes/reports.route';
import docsRouter from './routes/docs.route';
import { errorHandler } from './middlewares/errorHandler';
import { defaultTenant } from './middlewares/defaultTenant';
import { debugRequest } from './middlewares/debugRequest';

export function createApp() {
  const app = express();
  
  // Handle ALL requests to auth endpoints directly
  // app.all('/v1/auth/login', async (req, res) => {
  //   // Handle OPTIONS
  //   if (req.method === 'OPTIONS') {
  //     res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  //     res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  //     res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-tenant-id');
  //     res.header('Access-Control-Allow-Credentials', 'true');
  //     return res.sendStatus(200);
  //   }
    
  //   // Handle POST login
  //   if (req.method === 'POST') {
  //     res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  //     res.header('Access-Control-Allow-Credentials', 'true');
  //     return res.json({ message: 'Direct login handler working', body: req.body });
  //   }
    
  //   res.status(405).json({ error: 'Method not allowed' });
  // });
  
  // Handle OPTIONS requests FIRST before any other middleware
  app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-tenant-id');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
  });
  
  // CORS middleware with more detailed configuration
  app.use((req, res, next) => {
    // Allow all origins for testing
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-tenant-id');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    
    next();
  });
  app.use(express.json());

  // Tenant context middleware - Part 1
  app.use((req, _res, next) => {
    const schema = req.headers['x-tenant-id'];
    
    // For debugging
    console.log('Request headers:', req.headers);
    console.log('x-tenant-id:', schema);
    
    if (typeof schema === 'string') {
      (req as any).schemaName = schema;
      console.log('Set schema name:', schema);
    }
    next();
  });

  // Simple test endpoint
  app.get('/test', (req, res) => {
    res.json({ message: 'API is working', method: req.method });
  });
  
  app.post('/test', (req, res) => {
    res.json({ message: 'POST working', body: req.body });
  });
  
  // Simple auth test
  app.post('/test-login', (req, res) => {
    res.json({ message: 'Login endpoint working', body: req.body });
  });
  
  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const { testConnection } = await import('./utils/db');
      const dbResult = await testConnection();
      res.json({ 
        status: 'ok', 
        database: dbResult.success ? 'connected' : 'failed',
        dbDetails: dbResult,
        env: process.env.NODE_ENV,
        envVars: {
          DB_HOST: process.env.DB_HOST ? 'SET' : 'NOT_SET',
          DB_USER: process.env.DB_USER ? 'SET' : 'NOT_SET',
          DB_NAME: process.env.DB_NAME ? 'SET' : 'NOT_SET'
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });
  
  // Debug schemas and tables endpoint with reset option
  app.get('/schemas', async (req, res) => {
    try {
      const reset = req.query.reset;
      
      if (reset === 'true') {
        // Reset database
        await pool.query('DROP SCHEMA IF EXISTS demo_tenant_001 CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.tenants CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.plans CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.admin_users CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.admin_activity_logs CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.migrations CASCADE');
        
        return res.json({ status: 'Database reset complete' });
      }
      
      const schemas = await pool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')");
      
      const tablesInfo: Record<string, string[]> = {};
      for (const schema of schemas.rows) {
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = $1", [schema.schema_name]);
        tablesInfo[schema.schema_name] = tables.rows.map(t => t.table_name);
      }
      
      res.json({ schemas: schemas.rows, tables: tablesInfo });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });
  
  // Simple migration endpoint
  const migrateHandler = async (req: any, res: any) => {
    try {
      const bcrypt = await import('bcrypt');
      
      // Drop everything
      await pool.query('DROP SCHEMA IF EXISTS production_tenant CASCADE');
      await pool.query('DROP SCHEMA IF EXISTS demo_tenant_001 CASCADE');
      await pool.query('DROP TABLE IF EXISTS public.tenants CASCADE');
      await pool.query('DROP TABLE IF EXISTS public.plans CASCADE');
      await pool.query('DROP TABLE IF EXISTS public.admin_users CASCADE');
      
      // Create tables
      await pool.query(`
        CREATE TABLE public.plans (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL);
        CREATE TABLE public.tenants (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, schema_name TEXT NOT NULL UNIQUE, plan_id UUID REFERENCES public.plans(id));
        CREATE TABLE public.admin_users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'superadmin');
        
        CREATE SCHEMA production_tenant;
        CREATE TABLE production_tenant.users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL);
        CREATE TABLE production_tenant.stations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, name TEXT NOT NULL, address TEXT, status TEXT NOT NULL DEFAULT 'active');
        CREATE TABLE production_tenant.pumps (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, station_id UUID NOT NULL REFERENCES production_tenant.stations(id), label TEXT NOT NULL, serial_number VARCHAR(100));
        CREATE TABLE production_tenant.nozzles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, pump_id UUID NOT NULL REFERENCES production_tenant.pumps(id), nozzle_number INTEGER NOT NULL, fuel_type TEXT NOT NULL);
        CREATE TABLE production_tenant.fuel_prices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, station_id UUID NOT NULL REFERENCES production_tenant.stations(id), fuel_type TEXT NOT NULL, price DECIMAL(10,2) NOT NULL, cost_price DECIMAL(10,2) DEFAULT 0, valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW());
        CREATE TABLE production_tenant.creditors (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, station_id UUID REFERENCES production_tenant.stations(id), party_name TEXT NOT NULL, contact_number TEXT, credit_limit DECIMAL(10,2) DEFAULT 0, status TEXT NOT NULL DEFAULT 'active');
        CREATE TABLE production_tenant.nozzle_readings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, nozzle_id UUID NOT NULL REFERENCES production_tenant.nozzles(id), station_id UUID NOT NULL REFERENCES production_tenant.stations(id), reading DECIMAL(10,3) NOT NULL, recorded_at TIMESTAMPTZ NOT NULL, payment_method TEXT, creditor_id UUID REFERENCES production_tenant.creditors(id));
        CREATE TABLE production_tenant.sales (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, nozzle_id UUID NOT NULL REFERENCES production_tenant.nozzles(id), station_id UUID NOT NULL REFERENCES production_tenant.stations(id), volume DECIMAL(10,3) NOT NULL, fuel_type TEXT NOT NULL, fuel_price DECIMAL(10,2) NOT NULL, cost_price DECIMAL(10,2) DEFAULT 0, amount DECIMAL(10,2) NOT NULL, profit DECIMAL(10,2) DEFAULT 0, payment_method TEXT NOT NULL, creditor_id UUID REFERENCES production_tenant.creditors(id), created_by UUID REFERENCES production_tenant.users(id), status TEXT NOT NULL DEFAULT 'posted', recorded_at TIMESTAMPTZ NOT NULL);
        CREATE TABLE production_tenant.credit_payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, creditor_id UUID NOT NULL REFERENCES production_tenant.creditors(id), amount DECIMAL(10,2) NOT NULL, payment_method TEXT NOT NULL, reference_number TEXT, notes TEXT);
        CREATE TABLE production_tenant.fuel_inventory (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, station_id UUID NOT NULL REFERENCES production_tenant.stations(id), fuel_type TEXT NOT NULL, current_stock DECIMAL(10,3) NOT NULL DEFAULT 0, minimum_level DECIMAL(10,3) NOT NULL DEFAULT 1000, last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW());
        CREATE TABLE production_tenant.alerts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, station_id UUID REFERENCES production_tenant.stations(id), alert_type TEXT NOT NULL, message TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'info', is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
        CREATE TABLE production_tenant.fuel_deliveries (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, station_id UUID NOT NULL REFERENCES production_tenant.stations(id), fuel_type TEXT NOT NULL, volume DECIMAL(10,3) NOT NULL CHECK (volume > 0), delivered_by TEXT, delivery_date DATE NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      `);
      
      // Comprehensive seed data
      const planId = (await pool.query('INSERT INTO public.plans (name) VALUES ($1) RETURNING id', ['Basic Plan'])).rows[0].id;
      const tenantId = (await pool.query('INSERT INTO public.tenants (name, schema_name, plan_id) VALUES ($1, $2, $3) RETURNING id', ['FuelSync Production', 'production_tenant', planId])).rows[0].id;
      
      const adminHash = await bcrypt.hash('admin123', 10);
      await pool.query('INSERT INTO public.admin_users (email, password_hash) VALUES ($1, $2)', ['admin@fuelsync.com', adminHash]);
      
      // Insert all user roles
      await pool.query('INSERT INTO production_tenant.users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)', [tenantId, 'owner@fuelsync.com', adminHash, 'Station Owner', 'owner']);
      await pool.query('INSERT INTO production_tenant.users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)', [tenantId, 'manager@fuelsync.com', adminHash, 'Station Manager', 'manager']);
      await pool.query('INSERT INTO production_tenant.users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)', [tenantId, 'attendant@fuelsync.com', adminHash, 'Pump Attendant', 'attendant']);
      
      // Insert 3 stations for realistic owner scenario
      const station1Id = (await pool.query('INSERT INTO production_tenant.stations (tenant_id, name, address) VALUES ($1, $2, $3) RETURNING id', [tenantId, 'Main Station', '123 Highway Road, Downtown'])).rows[0].id;
      const station2Id = (await pool.query('INSERT INTO production_tenant.stations (tenant_id, name, address) VALUES ($1, $2, $3) RETURNING id', [tenantId, 'North Branch', '456 North Street, Uptown'])).rows[0].id;
      const station3Id = (await pool.query('INSERT INTO production_tenant.stations (tenant_id, name, address) VALUES ($1, $2, $3) RETURNING id', [tenantId, 'East Plaza', '789 East Avenue, Eastside'])).rows[0].id;
      
      // Insert 26+ pumps across 3 stations (realistic scenario)
      const pumps = [];
      // Main Station - 10 pumps
      for(let i = 1; i <= 10; i++) {
        const pumpId = (await pool.query('INSERT INTO production_tenant.pumps (tenant_id, station_id, label, serial_number) VALUES ($1, $2, $3, $4) RETURNING id', [tenantId, station1Id, `Pump ${i}`, `MS-P${i.toString().padStart(3, '0')}-2024`])).rows[0].id;
        pumps.push({ id: pumpId, station: station1Id, label: `Pump ${i}` });
      }
      // North Branch - 8 pumps  
      for(let i = 1; i <= 8; i++) {
        const pumpId = (await pool.query('INSERT INTO production_tenant.pumps (tenant_id, station_id, label, serial_number) VALUES ($1, $2, $3, $4) RETURNING id', [tenantId, station2Id, `Pump ${i}`, `NB-P${i.toString().padStart(3, '0')}-2024`])).rows[0].id;
        pumps.push({ id: pumpId, station: station2Id, label: `Pump ${i}` });
      }
      // East Plaza - 8 pumps
      for(let i = 1; i <= 8; i++) {
        const pumpId = (await pool.query('INSERT INTO production_tenant.pumps (tenant_id, station_id, label, serial_number) VALUES ($1, $2, $3, $4) RETURNING id', [tenantId, station3Id, `Pump ${i}`, `EP-P${i.toString().padStart(3, '0')}-2024`])).rows[0].id;
        pumps.push({ id: pumpId, station: station3Id, label: `Pump ${i}` });
      }
      
      // Insert nozzles for all pumps (2 nozzles per pump)
      const nozzles = [];
      const fuelTypes = ['petrol', 'diesel', 'premium'];
      for(const pump of pumps) {
        // Each pump gets 2 nozzles with different fuel types
        const nozzle1Id = (await pool.query('INSERT INTO production_tenant.nozzles (tenant_id, pump_id, nozzle_number, fuel_type) VALUES ($1, $2, $3, $4) RETURNING id', [tenantId, pump.id, 1, fuelTypes[0]])).rows[0].id;
        const nozzle2Id = (await pool.query('INSERT INTO production_tenant.nozzles (tenant_id, pump_id, nozzle_number, fuel_type) VALUES ($1, $2, $3, $4) RETURNING id', [tenantId, pump.id, 2, fuelTypes[Math.floor(Math.random() * 3)]])).rows[0].id;
        nozzles.push({ id: nozzle1Id, pump: pump.id, station: pump.station, fuel: fuelTypes[0] });
        nozzles.push({ id: nozzle2Id, pump: pump.id, station: pump.station, fuel: fuelTypes[Math.floor(Math.random() * 3)] });
      }
      
      // Insert fuel prices with cost prices for all stations
      const stations = [station1Id, station2Id, station3Id];
      const prices = { 
        petrol: { sell: [95.50, 94.80, 96.20], cost: [85.00, 84.50, 85.50] },
        diesel: { sell: [87.25, 86.90, 88.10], cost: [78.00, 77.80, 78.50] },
        premium: { sell: [105.75, 104.90, 106.50], cost: [95.00, 94.50, 95.80] }
      };
      for(let i = 0; i < stations.length; i++) {
        await pool.query('INSERT INTO production_tenant.fuel_prices (tenant_id, station_id, fuel_type, price, cost_price) VALUES ($1, $2, $3, $4, $5)', [tenantId, stations[i], 'petrol', prices.petrol.sell[i], prices.petrol.cost[i]]);
        await pool.query('INSERT INTO production_tenant.fuel_prices (tenant_id, station_id, fuel_type, price, cost_price) VALUES ($1, $2, $3, $4, $5)', [tenantId, stations[i], 'diesel', prices.diesel.sell[i], prices.diesel.cost[i]]);
        await pool.query('INSERT INTO production_tenant.fuel_prices (tenant_id, station_id, fuel_type, price, cost_price) VALUES ($1, $2, $3, $4, $5)', [tenantId, stations[i], 'premium', prices.premium.sell[i], prices.premium.cost[i]]);
        
        // Insert inventory data
        await pool.query('INSERT INTO production_tenant.fuel_inventory (tenant_id, station_id, fuel_type, current_stock, minimum_level) VALUES ($1, $2, $3, $4, $5)', [tenantId, stations[i], 'petrol', 5000 + Math.random() * 3000, 1000]);
        await pool.query('INSERT INTO production_tenant.fuel_inventory (tenant_id, station_id, fuel_type, current_stock, minimum_level) VALUES ($1, $2, $3, $4, $5)', [tenantId, stations[i], 'diesel', 4000 + Math.random() * 2000, 800]);
        await pool.query('INSERT INTO production_tenant.fuel_inventory (tenant_id, station_id, fuel_type, current_stock, minimum_level) VALUES ($1, $2, $3, $4, $5)', [tenantId, stations[i], 'premium', 2000 + Math.random() * 1000, 500]);
      }
      
      // Insert station-specific creditors
      const creditors = [];
      // Main Station creditors
      const creditor1Id = (await pool.query('INSERT INTO production_tenant.creditors (tenant_id, station_id, party_name, contact_number, credit_limit) VALUES ($1, $2, $3, $4, $5) RETURNING id', [tenantId, station1Id, 'ABC Transport Co.', '+1234567890', 50000])).rows[0].id;
      const creditor2Id = (await pool.query('INSERT INTO production_tenant.creditors (tenant_id, station_id, party_name, contact_number, credit_limit) VALUES ($1, $2, $3, $4, $5) RETURNING id', [tenantId, station1Id, 'Downtown Delivery', '+1111222233', 30000])).rows[0].id;
      // North Branch creditors
      const creditor3Id = (await pool.query('INSERT INTO production_tenant.creditors (tenant_id, station_id, party_name, contact_number, credit_limit) VALUES ($1, $2, $3, $4, $5) RETURNING id', [tenantId, station2Id, 'XYZ Logistics Ltd.', '+0987654321', 25000])).rows[0].id;
      const creditor4Id = (await pool.query('INSERT INTO production_tenant.creditors (tenant_id, station_id, party_name, contact_number, credit_limit) VALUES ($1, $2, $3, $4, $5) RETURNING id', [tenantId, station2Id, 'North Taxi Service', '+2222333344', 15000])).rows[0].id;
      // East Plaza creditors
      const creditor5Id = (await pool.query('INSERT INTO production_tenant.creditors (tenant_id, station_id, party_name, contact_number, credit_limit) VALUES ($1, $2, $3, $4, $5) RETURNING id', [tenantId, station3Id, 'City Bus Service', '+1122334455', 75000])).rows[0].id;
      const creditor6Id = (await pool.query('INSERT INTO production_tenant.creditors (tenant_id, station_id, party_name, contact_number, credit_limit) VALUES ($1, $2, $3, $4, $5) RETURNING id', [tenantId, station3Id, 'East Side Trucks', '+3333444455', 40000])).rows[0].id;
      creditors.push(creditor1Id, creditor2Id, creditor3Id, creditor4Id, creditor5Id, creditor6Id);
      
      // Insert realistic nozzle readings across all stations (last 30 days)
      const paymentMethods = ['cash', 'card', 'upi', 'credit'];
      let readingCount = 0;
      for(const nozzle of nozzles.slice(0, 20)) { // Sample readings for first 20 nozzles
        const baseReading = Math.floor(Math.random() * 1000) + 500;
        for(let day = 30; day >= 0; day--) {
          const reading = baseReading + (30 - day) * (Math.random() * 50 + 10);
          const recordedAt = new Date(Date.now() - day * 86400000 + Math.random() * 86400000);
          const paymentMethod = paymentMethods[Math.floor(Math.random() * 4)];
          const creditorId = paymentMethod === 'credit' ? creditors[Math.floor(Math.random() * creditors.length)] : null;
          
          await pool.query('INSERT INTO production_tenant.nozzle_readings (tenant_id, nozzle_id, station_id, reading, recorded_at, payment_method, creditor_id) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
            [tenantId, nozzle.id, nozzle.station, reading, recordedAt, paymentMethod, creditorId]);
          readingCount++;
        }
      }
      
      // Insert comprehensive sales data with profit calculation
      let salesCount = 0;
      const ownerUserId = (await pool.query('SELECT id FROM production_tenant.users WHERE role = $1 LIMIT 1', ['owner'])).rows[0]?.id;
      
      for(const nozzle of nozzles.slice(0, 15)) { // Sales for first 15 nozzles
        for(let day = 7; day >= 0; day--) { // Last 7 days of sales
          const volume = Math.random() * 50 + 10; // 10-60 liters
          const fuelPrice = nozzle.fuel === 'petrol' ? 95.50 : nozzle.fuel === 'diesel' ? 87.25 : 105.75;
          const costPrice = nozzle.fuel === 'petrol' ? 85.00 : nozzle.fuel === 'diesel' ? 78.00 : 95.00;
          const amount = volume * fuelPrice;
          const profit = volume * (fuelPrice - costPrice);
          const recordedAt = new Date(Date.now() - day * 86400000 + Math.random() * 86400000);
          const paymentMethod = paymentMethods[Math.floor(Math.random() * 4)];
          const creditorId = paymentMethod === 'credit' ? creditors[Math.floor(Math.random() * creditors.length)] : null;
          
          await pool.query('INSERT INTO production_tenant.sales (tenant_id, nozzle_id, station_id, volume, fuel_type, fuel_price, cost_price, amount, profit, payment_method, creditor_id, created_by, recorded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)', 
            [tenantId, nozzle.id, nozzle.station, volume, nozzle.fuel, fuelPrice, costPrice, amount, profit, paymentMethod, creditorId, ownerUserId, recordedAt]);
          salesCount++;
        }
      }
      
      // Insert credit payments for all creditors
      let paymentCount = 0;
      for(const creditorId of creditors) {
        const paymentAmount = Math.floor(Math.random() * 10000) + 5000;
        const paymentMethods = ['cash', 'bank_transfer', 'check'];
        const method = paymentMethods[Math.floor(Math.random() * 3)];
        const refNumber = method !== 'cash' ? `REF${Math.floor(Math.random() * 100000)}` : null;
        
        await pool.query('INSERT INTO production_tenant.credit_payments (tenant_id, creditor_id, amount, payment_method, reference_number, notes) VALUES ($1, $2, $3, $4, $5, $6)', 
          [tenantId, creditorId, paymentAmount, method, refNumber, 'Payment received']);
        paymentCount++;
      }
      
      res.json({ 
        status: 'success', 
        message: 'Production database with comprehensive seed data created',
        users: [
          'admin@fuelsync.com / admin123 (SuperAdmin)',
          'owner@fuelsync.com / admin123 (Owner)', 
          'manager@fuelsync.com / admin123 (Manager)',
          'attendant@fuelsync.com / admin123 (Attendant)'
        ],
        data: {
          stations: 3,
          pumps: 26, 
          nozzles: 52,
          creditors: 6,
          fuelPrices: 9,
          inventory: 9,
          readings: readingCount,
          sales: salesCount,
          payments: paymentCount,
          features: ['profit_tracking', 'inventory_management', 'station_comparison', 'alerts_system']
        }
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  };
  
  app.get('/migrate', migrateHandler);
  app.post('/migrate', migrateHandler);
  


  
  // Add debug and default tenant middleware
  app.use(debugRequest);
  app.use(defaultTenant);
  
  // API Documentation
  app.use('/api/docs', docsRouter);
  
  const API_PREFIX = '/api/v1';

  app.use(`${API_PREFIX}/auth`, createAuthRouter(pool));
  app.use(`${API_PREFIX}/admin`, createAdminApiRouter(pool));
  app.use(`${API_PREFIX}/users`, createUserRouter(pool));
  app.use(`${API_PREFIX}/stations`, createStationRouter(pool));
  app.use(`${API_PREFIX}/pumps`, createPumpRouter(pool));
  app.use(`${API_PREFIX}/nozzles`, createNozzleRouter(pool));
  app.use(`${API_PREFIX}/nozzle-readings`, createNozzleReadingRouter(pool));
  app.use(`${API_PREFIX}/fuel-prices`, createFuelPriceRouter(pool));
  app.use(`${API_PREFIX}/creditors`, createCreditorRouter(pool));
  app.use(`${API_PREFIX}/credit-payments`, createCreditPaymentRouter(pool));
  app.use(`${API_PREFIX}/fuel-deliveries`, createDeliveryRouter(pool));
  app.use(`${API_PREFIX}/reconciliation`, createReconciliationRouter(pool));
  app.use(`${API_PREFIX}/sales`, createSalesRouter(pool));
  app.use(`${API_PREFIX}/settings`, createSettingsRouter(pool));
  app.use(`${API_PREFIX}/fuel-inventory`, createFuelInventoryRouter(pool));
  app.use(`${API_PREFIX}/tenants`, createTenantRouter(pool));
  app.use(`${API_PREFIX}/dashboard`, createDashboardRouter(pool));
  app.use(`${API_PREFIX}/inventory`, createInventoryRouter(pool));
  app.use(`${API_PREFIX}/reports`, createReportsRouter(pool));

  app.use(errorHandler);
  return app;
}

// Export the app for external integrations
const app = createApp();
export default app;

// For local development
if (require.main === module) {
  const port = process.env.PORT || 3003;
  app.listen(port, () => {
    console.log(`FuelSync API listening on ${port}`);
  });
}
