import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createNozzleHandlers } from '../controllers/nozzle.controller';
import { checkNozzleLimit } from '../middlewares/checkPlanLimits';

export function createNozzleRouter(db: Pool) {
  const router = Router();
  const handlers = createNozzleHandlers(db);

  router.post('/', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), checkNozzleLimit(db), handlers.create);
  router.get('/', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.list);
  router.delete('/:id', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.remove);

  return router;
}
