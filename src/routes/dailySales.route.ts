import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { setTenantContext } from '../middlewares/setTenantContext';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createDailySalesHandlers } from '../controllers/dailySales.controller';

export function createDailySalesRouter(db: Pool) {
  const router = Router();
  const handlers = createDailySalesHandlers(db);

  router.get('/daily-sales', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager]), handlers.getDailySales);

  return router;
}