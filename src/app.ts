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
  
  // Simple seed endpoint for Nile DB
  app.post('/migrate', async (req, res) => {
    try {
      const bcrypt = await import('bcrypt');
      const { randomUUID } = await import('crypto');
      
      // Get the tenant schema name
      const schemas = await pool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE '%tenant%'");
      const tenantSchema = schemas.rows[0]?.schema_name;
      
      if (!tenantSchema) {
        return res.status(400).json({ status: 'error', message: 'No tenant schema found' });
      }
      
      // Create admin user in tenant schema
      const adminHash = await bcrypt.hash('Admin@123!', 10);
      await pool.query(`INSERT INTO ${tenantSchema}.users (id, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`, 
        [randomUUID(), 'admin@fuelsync.dev', adminHash, 'superadmin']);
      
      // Create demo users
      const ownerHash = await bcrypt.hash('Owner@123!', 10);
      await pool.query(`INSERT INTO ${tenantSchema}.users (id, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`, 
        [randomUUID(), 'owner@demo.com', ownerHash, 'owner']);
      
      res.json({ 
        status: 'success', 
        message: 'Users seeded successfully',
        schema: tenantSchema,
        users: ['admin@fuelsync.dev', 'owner@demo.com']
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });
  
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
