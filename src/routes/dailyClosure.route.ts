import { Router } from 'express';
import { Pool } from 'pg';
import { createDailyClosureHandlers } from '../controllers/dailyClosure.controller';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';

export function createDailyClosureRoutes(db: Pool): Router {
  const router = Router();
  const handlers = createDailyClosureHandlers(db);

  // All routes require authentication
  router.use(authenticateJWT);

  // GET /daily-closure/summary/:stationId/:date - Get daily summary
  router.get('/summary/:stationId/:date', handlers.getSummary);

  // POST /daily-closure/validate - Validate closure attempt
  router.post('/validate', handlers.validateClosure);

  // POST /daily-closure/close - Close business day (managers/owners only)
  router.post('/close', requireRole([UserRole.Manager, UserRole.Owner]), handlers.closeBusiness);

  // GET /daily-closure/open - Get open days
  router.get('/open', handlers.getOpenDays);

  // GET /daily-closure/check/:stationId/:date - Check if day is closed
  router.get('/check/:stationId/:date', handlers.checkClosed);

  return router;
}