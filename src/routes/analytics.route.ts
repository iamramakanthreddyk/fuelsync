import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { enforceAnalyticsAccess } from '../middlewares/roleBasedAccess';
import { UserRole } from '../constants/auth';
import { createAnalyticsHandlers } from '../controllers/analytics.controller';

export function createAnalyticsRouter(db: Pool) {
  const router = Router();
  const handlers = createAnalyticsHandlers();
  
  // Middleware to ensure SuperAdmin role
  const requireSuperAdmin = requireRole([UserRole.SuperAdmin]);
  
  // Dashboard metrics
  router.get(
    '/dashboard',
    authenticateJWT,
    requireRole([UserRole.Owner, UserRole.Manager]),
    handlers.tenantDashboard
  );
  router.get('/superadmin', authenticateJWT, requireSuperAdmin, handlers.getDashboardMetrics);
  
  // Tenant analytics
  router.get('/tenant/:id', authenticateJWT, requireSuperAdmin, handlers.getTenantAnalytics);

  // Station comparison for owners (Pro+ only)
  router.get('/station-comparison', authenticateJWT, enforceAnalyticsAccess(db), requireRole([UserRole.Owner]), handlers.stationComparison);
  router.get('/station-ranking', authenticateJWT, enforceAnalyticsAccess(db), requireRole([UserRole.Owner]), handlers.stationRanking);

  // Advanced analytics (Enterprise only)
  router.get('/hourly-sales', authenticateJWT, enforceAnalyticsAccess(db, true), requireRole([UserRole.Owner, UserRole.Manager]), handlers.hourlySales);
  router.get('/peak-hours', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.peakHours);
  router.get('/fuel-performance', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.fuelPerformance);
  
  return router;
}