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

  router.post('/run', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.run);
  router.get('/list', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.list);
  router.get('/:id', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.getById);
  router.post('/', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.create);
  router.get('/daily-summary', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.getDailySummary);
  router.get('/:stationId/:date', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.get);
  router.post('/:id/approve', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.approve);

  return router;
}
