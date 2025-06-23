import { Router } from 'express';
import { Pool } from 'pg';
import { createAdminUserRouter } from './adminUser.route';
import { createAdminTenantRouter } from './adminTenant.route';
import { createAdminAnalyticsRouter } from './adminAnalytics.route';

export function createAdminApiRouter(db: Pool) {
  const router = Router();
  router.use('/users', createAdminUserRouter(db));
  router.use('/tenants', createAdminTenantRouter(db));
  router.use('/analytics', createAdminAnalyticsRouter(db));
  return router;
}
