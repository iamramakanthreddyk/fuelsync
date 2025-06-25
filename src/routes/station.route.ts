import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { setTenantContext } from '../middlewares/setTenantContext';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createStationHandlers } from '../controllers/station.controller';
import { checkStationLimit } from '../middlewares/checkPlanLimits';

export function createStationRouter(db: Pool) {
  const router = Router();
  const handlers = createStationHandlers(db);

  router.post('/', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), checkStationLimit(db), handlers.create);
  router.get('/', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.list);
  router.get('/compare', authenticateJWT, requireRole([UserRole.Owner]), handlers.compare);
  router.get('/ranking', authenticateJWT, requireRole([UserRole.Owner]), handlers.ranking);
  router.get('/:id/metrics', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.metrics);
  router.get('/:id/performance', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.performance);
  router.put('/:id', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.update);
  router.delete('/:id', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.remove);
  router.get('/:id/metrics', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.metrics);
  router.get('/:id/performance', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.performance);

  return router;
}
