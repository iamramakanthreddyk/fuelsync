import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createAdminTenantHandlers } from '../controllers/tenant.controller';

// Middleware to extract tenant ID from URL params for admin routes
const extractTenantFromParams = (req: any, res: any, next: any) => {
  if (req.params.id) {
    req.tenantId = req.params.id;
  }
  next();
};

export function createAdminTenantRouter(db: Pool) {
  const router = Router();
  const handlers = createAdminTenantHandlers(db);

  router.get('/summary', authenticateJWT, requireRole([UserRole.SuperAdmin]), handlers.summary);
  router.get('/', authenticateJWT, requireRole([UserRole.SuperAdmin]), handlers.list);
  router.get('/:id', authenticateJWT, requireRole([UserRole.SuperAdmin]), extractTenantFromParams, handlers.get);
  router.post('/', authenticateJWT, requireRole([UserRole.SuperAdmin]), handlers.create);
  router.patch('/:id/status', authenticateJWT, requireRole([UserRole.SuperAdmin]), extractTenantFromParams, handlers.updateStatus);
  router.patch('/:id/plan', authenticateJWT, requireRole([UserRole.SuperAdmin]), extractTenantFromParams, handlers.updatePlan);
  router.delete('/:id', authenticateJWT, requireRole([UserRole.SuperAdmin]), extractTenantFromParams, handlers.delete);

  return router;
}
