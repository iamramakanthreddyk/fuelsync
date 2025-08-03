import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createSettingsHandlers } from '../controllers/settings.controller';

export function createSettingsRouter(db: Pool) {
  const router = Router();
  const handlers = createSettingsHandlers(db);

  router.get('/', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.get);
  router.post('/', authenticateJWT, requireRole([UserRole.Owner]), handlers.update);
  router.get('/plan', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.getPlanInfo);

  return router;
}
