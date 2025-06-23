import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createDashboardHandlers } from '../controllers/dashboard.controller';

export function createDashboardRouter(db: Pool) {
  const router = Router();
  const handlers = createDashboardHandlers(db);

  router.get('/sales-summary', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.getSalesSummary);
  router.get('/payment-methods', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.getPaymentMethodBreakdown);
  router.get('/fuel-breakdown', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.getFuelTypeBreakdown);
  router.get('/top-creditors', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.getTopCreditors);
  router.get('/sales-trend', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.getDailySalesTrend);

  return router;
}
