import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createAnalyticsHandlers } from '../controllers/analytics.controller';

export function createAnalyticsRouter(db: Pool) {
  const router = Router();
  const handlers = createAnalyticsHandlers(db);
  
  // Middleware to ensure SuperAdmin role
  const requireSuperAdmin = requireRole([UserRole.SuperAdmin]);
  
  // Dashboard metrics
  router.get('/dashboard', authenticateJWT, requireSuperAdmin, handlers.getDashboardMetrics);
  router.get('/superadmin', authenticateJWT, requireSuperAdmin, handlers.getDashboardMetrics);
  
  // Tenant analytics
  router.get('/tenant/:id', authenticateJWT, requireSuperAdmin, handlers.getTenantAnalytics);
  
  return router;
}