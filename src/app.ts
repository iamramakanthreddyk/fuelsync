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
import docsRouter from './routes/docs.route';
import { errorHandler } from './middlewares/errorHandler';

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
  
  app.use(cors({
    origin: [
      'http://localhost:8080',
      'http://localhost:3000',
      /\.azurewebsites\.net$/,
      /\.lovable\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
  }));
  app.use(express.json());

  app.use((req, _res, next) => {
    const schema = req.headers['x-tenant-id'];
    if (typeof schema === 'string') {
      (req as any).schemaName = schema;
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
  
  // Debug schemas and tables endpoint
  app.get('/schemas', async (req, res) => {
    try {
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
  
  // Simple seed endpoint - both GET and POST
  const migrateHandler = async (req: any, res: any) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const bcrypt = await import('bcrypt');
      const { randomUUID } = await import('crypto');
      
      // Create tables directly
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.plans (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL,
          config_json JSONB NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS public.tenants (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL,
          schema_name TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          plan_id UUID REFERENCES public.plans(id)
        );
        
        CREATE TABLE IF NOT EXISTS public.admin_users (
          id UUID PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      
      // Create tenant schema and table
      await pool.query('CREATE SCHEMA IF NOT EXISTS demo_tenant_001');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS demo_tenant_001.users (
          id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      
      // Seed data
      const planId = randomUUID();
      const tenantId = randomUUID();
      
      await pool.query('INSERT INTO public.plans (id, name, config_json) VALUES ($1, $2, $3)', [planId, 'basic', '{}']);
      await pool.query('INSERT INTO public.tenants (id, name, schema_name, plan_id) VALUES ($1, $2, $3, $4)', [tenantId, 'Demo Company', 'demo_tenant_001', planId]);
      
      const adminHash = await bcrypt.hash('password', 10);
      await pool.query('INSERT INTO public.admin_users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)', [randomUUID(), 'admin@fuelsync.dev', adminHash, 'superadmin']);
      
      const ownerHash = await bcrypt.hash('password', 10);
      await pool.query('INSERT INTO demo_tenant_001.users (id, tenant_id, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)', [randomUUID(), tenantId, 'owner@demo.com', ownerHash, 'owner']);
      
      res.json({ 
        status: 'success', 
        message: 'Database migrated and seeded',
        users: ['admin@fuelsync.dev / password', 'owner@demo.com / password']
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  };
  
  app.get('/migrate', migrateHandler);
  app.post('/migrate', migrateHandler);

  
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

  app.use(errorHandler);
  return app;
}

// Export the app for external integrations
const app = createApp();
export default app;

// For local development
if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`FuelSync API listening on ${port}`);
  });
}
