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
      const dbOk = await testConnection();
      res.json({ 
        status: 'ok', 
        database: dbOk ? 'connected' : 'failed',
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
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
