import express from 'express';
import cors from 'cors';
import pool from './utils/db';
import { createAuthRouter } from './routes/auth.route';
import { createAdminAuthRouter } from './routes/adminAuth.route';
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
import { createReconciliationDiffRoutes } from './routes/reconciliationDiff.route';
import { createSalesRouter } from './routes/sales.route';
import { createSettingsRouter } from './routes/settings.route';
import { createFuelInventoryRouter } from './routes/fuelInventory.route';
import { createTenantRouter } from './routes/tenant.route';
import { createDashboardRouter } from './routes/dashboard.route';
import { createInventoryRouter } from './routes/inventory.route';
import { createReportsRouter } from './routes/reports.route';
import { createAnalyticsRouter } from './routes/analytics.route';
import { createAlertsRouter } from './routes/alerts.route';
import { createAttendantRouter } from "./routes/attendant.route";
import { createSetupStatusRouter } from './routes/setupStatus.route';
import { createDailySalesRouter } from './routes/dailySales.route';
import docsRouter from './routes/docs.route';
import { errorHandler } from './middlewares/errorHandler';
import { successResponse } from './utils/successResponse';
import { errorResponse } from './utils/errorResponse';
import { authenticateJWT } from './middlewares/authenticateJWT';

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

  // Tenant context is now handled by JWT-based setTenantContext middleware in individual routes
  // No global tenant context middleware needed

  // Simple test endpoint
  app.get('/test', (req, res) => {
    successResponse(res, { method: req.method }, 'API is working');
  });

  app.post('/test', (req, res) => {
    successResponse(res, { body: req.body }, 'POST working');
  });

  // Simple auth test
  app.post('/test-login', (req, res) => {
    successResponse(res, { body: req.body }, 'Login endpoint working');
  });
  
  // Enhanced health check endpoint with detailed diagnostics
  app.get('/health', async (_req, res) => {
    try {
      const { testConnection } = await import('./utils/db');
      console.log('[HEALTH] Running database connection test...');
      const dbResult = await testConnection();
      
      // Get system information
      const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        cpus: require('os').cpus().length
      };
      
      // Get environment variables (filtered for security)
      const envVars = {
        NODE_ENV: process.env.NODE_ENV,
        DB_HOST: process.env.DB_HOST ? 'SET' : 'NOT_SET',
        DB_USER: process.env.DB_USER ? 'SET' : 'NOT_SET',
        DB_NAME: process.env.DB_NAME ? 'SET' : 'NOT_SET',
        DB_PORT: process.env.DB_PORT || '5432',
        POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT_SET',
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        PORT: process.env.PORT || '3003'
      };
      
      // Check if we're running in Azure
      const isAzure = process.env.WEBSITE_SITE_NAME || process.env.WEBSITE_INSTANCE_ID || false;
      
      successResponse(res, {
        status: dbResult.success ? 'ok' : 'database_error',
        database: dbResult.success ? 'connected' : 'failed',
        dbDetails: dbResult,
        env: process.env.NODE_ENV,
        isAzure,
        system: systemInfo,
        envVars,
        timestamp: new Date().toISOString()
      });
      
      console.log('[HEALTH] Health check completed with status:', dbResult.success ? 'ok' : 'database_error');
    } catch (err: any) {
      console.error('[HEALTH] Health check failed with error:', err);
      errorResponse(res, 500, {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Debug tables endpoint with reset option
  const schemasHandler = async (req: any, res: any) => {
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

        return successResponse(res, { status: 'Database reset complete' });
      }

      const tablesResult = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
      successResponse(res, { tables: tablesResult.rows.map(t => t.table_name) });
    } catch (err: any) {
      errorResponse(res, 500, err.message);
    }
  };

  if (process.env.NODE_ENV !== 'production') {
    app.get('/schemas', schemasHandler);
  } else {
    app.get('/schemas', authenticateJWT, (_req, res) => {
      errorResponse(res, 403, 'Disabled in production');
    });
  }
  
  


  
  // Add debug middleware in non-production or when DEBUG_REQUESTS is enabled
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_REQUESTS === 'true') {
    app.use(debugRequest);
  }
  
  // API Documentation
  app.use('/api/docs', docsRouter);
  
  const API_PREFIX = '/api/v1';

  app.use(`${API_PREFIX}/auth`, createAuthRouter(pool));
  app.use(`${API_PREFIX}/admin/auth`, createAdminAuthRouter(pool));
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
  app.use(`${API_PREFIX}/reconciliation`, createReconciliationDiffRoutes(pool));
  app.use(`${API_PREFIX}/sales`, createSalesRouter(pool));
  app.use(`${API_PREFIX}/tenant/settings`, createSettingsRouter(pool));
  // deprecated path
  app.use(`${API_PREFIX}/settings`, createSettingsRouter(pool));
  app.use(`${API_PREFIX}/fuel-inventory`, createFuelInventoryRouter(pool));
  app.use(`${API_PREFIX}/alerts`, createAlertsRouter(pool));
  app.use(`${API_PREFIX}/tenants`, createTenantRouter(pool));
  app.use(`${API_PREFIX}/dashboard`, createDashboardRouter(pool));
  app.use(`${API_PREFIX}/inventory`, createInventoryRouter(pool));
  app.use(`${API_PREFIX}/reports`, createReportsRouter(pool));
  app.use(`${API_PREFIX}/reports`, createDailySalesRouter(pool));
  app.use(`${API_PREFIX}/analytics`, createAnalyticsRouter());
  app.use(`${API_PREFIX}`, createSetupStatusRouter(pool));
  app.use(`${API_PREFIX}/attendant`, createAttendantRouter(pool));

  app.use('*', (_req, res) => {
    return errorResponse(res, 404, 'Route not found');
  });

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
