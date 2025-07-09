import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { setTenantContext } from '../middlewares/setTenantContext';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createReconciliationDiffHandlers } from '../controllers/reconciliationDiff.controller';

export function createReconciliationDiffRoutes(db: Pool): Router {
  const router = Router();
  const handlers = createReconciliationDiffHandlers(db);

  // All routes require authentication and tenant context
  router.use(authenticateJWT);
  router.use(setTenantContext);
  router.use(requireRole([UserRole.Owner, UserRole.Manager]));

  // Routes
  router.get('/differences', handlers.list);
  router.get('/differences/summary', handlers.getSummary);
  router.get('/differences/:id', handlers.getById);

  return router;}