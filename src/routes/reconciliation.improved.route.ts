/**
 * @file routes/reconciliation.improved.route.ts
 * @description Simplified reconciliation routes
 */
import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { setTenantContext } from '../middlewares/setTenantContext';
import { enforceRoleAccess } from '../middlewares/roleBasedAccess';
import { createImprovedReconciliationHandlers } from '../controllers/reconciliation.improved.controller';

export function createImprovedReconciliationRouter(db: Pool) {
  const router = Router();
  const handlers = createImprovedReconciliationHandlers(db);

  // All routes require authentication and manager/owner role
  const requireManagerRole = [
    authenticateJWT,
    setTenantContext,
    enforceRoleAccess(db, { feature: 'reconciliation', action: 'view' })
  ];

  // Get reconciliation summary for a specific date and station
  router.get('/summary', ...requireManagerRole, handlers.getReconciliationSummary);

  // Close the day after reviewing differences
  router.post('/close-day', ...requireManagerRole, handlers.closeDayReconciliation);

  // Get reconciliation history
  router.get('/history', ...requireManagerRole, handlers.getReconciliationHistory);

  // Get reconciliation dashboard
  router.get('/dashboard', ...requireManagerRole, handlers.getReconciliationDashboard);

  return router;
}
