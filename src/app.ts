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
      'http://localhost:3003',
      'https://lovableproject.com',
      /\.lovableproject\.com$/,
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
  
  // Production migration endpoint
  const migrateHandler = async (req: any, res: any) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Run production schema migration
      const schemaSQL = fs.readFileSync(path.join(__dirname, '../migrations/001_production_schema.sql'), 'utf8');
      await pool.query(schemaSQL);
      
      // Run production seed data
      const seedSQL = fs.readFileSync(path.join(__dirname, '../migrations/002_production_seed.sql'), 'utf8');
      await pool.query(seedSQL);
      
      res.json({ 
        status: 'success', 
        message: 'Production database migrated and seeded',
        users: [
          'admin@fuelsync.com / admin123 (SuperAdmin)',
          'owner@fuelsync.com / admin123 (Owner)',
          'manager@fuelsync.com / admin123 (Manager)',
          'attendant@fuelsync.com / admin123 (Attendant)'
        ]
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
