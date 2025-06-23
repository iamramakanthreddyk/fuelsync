import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createCreditorHandlers } from '../controllers/creditor.controller';

export function createCreditorRouter(db: Pool) {
  const router = Router();
  const handlers = createCreditorHandlers(db);

  router.post('/', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.create);
  router.get('/', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.list);
  router.put('/:id', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.update);
  router.delete('/:id', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.remove);

  router.post('/payments', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.createPayment);
  router.get('/payments', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.listPayments);

  return router;
}
