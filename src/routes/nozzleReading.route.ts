import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createNozzleReadingHandlers } from '../controllers/nozzleReading.controller';

export function createNozzleReadingRouter(db: Pool) {
  const router = Router();
  const handlers = createNozzleReadingHandlers(db);

  router.post('/', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.create);
  router.get('/', authenticateJWT, requireRole([UserRole.Owner, UserRole.Manager]), handlers.list);

  return router;
}
