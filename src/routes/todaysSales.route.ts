import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { setTenantContext } from '../middlewares/setTenantContext';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createTodaysSalesHandlers } from '../controllers/todaysSales.controller';

export function createTodaysSalesRoutes(db: Pool): Router {
  const router = Router();
  const handlers = createTodaysSalesHandlers(db);

  // All routes require authentication and tenant context
  router.use(authenticateJWT);
  router.use(setTenantContext);
  router.use(requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]));

  // Routes
  router.get('/summary', handlers.getTodaysSummary);

  return router;
}