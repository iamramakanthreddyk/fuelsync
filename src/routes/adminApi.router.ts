import { Router } from 'express';
import { Pool } from 'pg';
import { createAdminUserRouter } from './adminUser.route';
import { createAdminTenantRouter } from './adminTenant.route';
import { createAdminAnalyticsRouter } from './adminAnalytics.route';
import { createAdminUserHandlers } from '../controllers/adminUser.controller';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';

export function createAdminApiRouter(db: Pool) {
  const router = Router();
  const controller = createAdminUserHandlers(db);
  router.use('/users', createAdminUserRouter(db));
  router.use('/tenants', createAdminTenantRouter(db));
  router.get('/analytics', authenticateJWT, requireRole([UserRole.SuperAdmin]), controller.getAnalytics);
  router.use('/analytics', createAdminAnalyticsRouter(db));
  return router;
}
