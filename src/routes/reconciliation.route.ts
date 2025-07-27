import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { setTenantContext } from '../middlewares/setTenantContext';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createReconciliationHandlers } from '../controllers/reconciliation.controller';

export function createReconciliationRouter(db: Pool) {
  const router = Router();
  const handlers = createReconciliationHandlers(db);

  // Specific routes first
  router.get('/daily-summary', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.getDailySummary);
  router.post('/close-with-cash', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.closeWithCash);
  router.post('/create', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.create);
  
  // General routes
  router.get('/', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.list);
  router.post('/', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.run);
  
  // Parameter routes last
  router.get('/:stationId/:date', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.get);
  router.get('/:id', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.getById);
  router.post('/:id/approve', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.approve);

  return router;
}
