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
import { createDeliveryRouter } from './routes/delivery.route';
import { createReconciliationRouter } from './routes/reconciliation.route';
import { createSalesRouter } from './routes/sales.route';
import { createSettingsRouter } from './routes/settings.route';
import { createFuelInventoryRouter } from './routes/fuelInventory.route';
import docsRouter from './routes/docs.route';
import { errorHandler } from './middlewares/errorHandler';

export function createApp() {
  const app = express();
  app.use(cors({
    origin: [
      'http://localhost:8080', 
      'http://localhost:3000',
      'https://your-app.vercel.app', // Replace with your actual Vercel domain
      /\.vercel\.app$/
    ],
    credentials: true
  }));
  app.use(express.json());

  app.use((req, _res, next) => {
    const schema = req.headers['x-tenant-id'];
    if (typeof schema === 'string') {
      (req as any).schemaName = schema;
    }
    next();
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
          // Vercel/Nile
          POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT_SET',
          NILEDB_URL: process.env.NILEDB_URL ? 'SET' : 'NOT_SET',
          // Azure
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
      
      // Run migration SQL first
      const migrationSql = fs.readFileSync(path.join(process.cwd(), 'migrations/001_create_public_schema.sql'), 'utf8');
      await pool.query(migrationSql);
      
      // Create tenant schema
      await pool.query('CREATE SCHEMA IF NOT EXISTS demo_tenant_001');
      
      const tenantSql = fs.readFileSync(path.join(process.cwd(), 'migrations/tenant_schema_template.sql'), 'utf8')
        .replace(/{{schema_name}}/g, 'demo_tenant_001');
      await pool.query(tenantSql);
      
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
  
  app.use('/v1/auth', createAuthRouter(pool));
  app.use('/v1/admin', createAdminApiRouter(pool));
  app.use('/v1/users', createUserRouter(pool));
  app.use('/v1/stations', createStationRouter(pool));
  app.use('/v1/pumps', createPumpRouter(pool));
  app.use('/v1/nozzles', createNozzleRouter(pool));
  app.use('/v1/nozzle-readings', createNozzleReadingRouter(pool));
  app.use('/v1/fuel-prices', createFuelPriceRouter(pool));
  app.use('/v1/creditors', createCreditorRouter(pool));
  app.use('/v1/fuel-deliveries', createDeliveryRouter(pool));
  app.use('/v1/reconciliation', createReconciliationRouter(pool));
  app.use('/v1/sales', createSalesRouter(pool));
  app.use('/v1/settings', createSettingsRouter(pool));
  app.use('/v1/fuel-inventory', createFuelInventoryRouter(pool));

  app.use(errorHandler);
  return app;
}

// Export the app for Vercel
const app = createApp();
export default app;

// For local development
if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`FuelSync API listening on ${port}`);
  });
}
