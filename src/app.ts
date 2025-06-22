import express from 'express';
import pool from './utils/db';
import docsRouter from './routes/docs.route';
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
import { errorHandler } from './middlewares/errorHandler';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    const schema = req.headers['x-tenant-id'];
    if (typeof schema === 'string') {
      (req as any).schemaName = schema;
    }
    next();
  });

  app.use('/api/docs', docsRouter);
  app.use('/api/auth', createAuthRouter(pool));
  app.use('/api/admin', createAdminApiRouter(pool));
  app.use('/api/users', createUserRouter(pool));
  app.use('/api/stations', createStationRouter(pool));
  app.use('/api/pumps', createPumpRouter(pool));
  app.use('/api/nozzles', createNozzleRouter(pool));
  app.use('/api/nozzle-readings', createNozzleReadingRouter(pool));
  app.use('/api/fuel-prices', createFuelPriceRouter(pool));
  app.use('/api/creditors', createCreditorRouter(pool));
  app.use('/api/fuel-deliveries', createDeliveryRouter(pool));
  app.use('/api/reconciliation', createReconciliationRouter(pool));

  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => {
    console.log(`FuelSync API listening on ${port}`);
  });
}
