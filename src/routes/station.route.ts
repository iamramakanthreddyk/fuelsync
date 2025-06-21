import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createStationHandlers } from '../controllers/station.controller';
import { checkStationLimit } from '../middlewares/checkPlanLimits';

export function createStationRouter(db: Pool) {
  const router = Router();
  const handlers = createStationHandlers(db);

  router.post('/', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), checkStationLimit(db), handlers.create);
  router.get('/', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.list);
  router.put('/:id', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.update);
  router.delete('/:id', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.remove);

  return router;
}
