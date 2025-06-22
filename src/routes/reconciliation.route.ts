import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createReconciliationHandlers } from '../controllers/reconciliation.controller';

export function createReconciliationRouter(db: Pool) {
  const router = Router();
  const handlers = createReconciliationHandlers(db);

  router.post('/reconciliation', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.create);
  router.get('/reconciliation/:stationId', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.get);

  return router;
}
