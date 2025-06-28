import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { setTenantContext } from '../middlewares/setTenantContext';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createAttendantHandlers } from '../controllers/attendant.controller';

export function createAttendantRouter(db: Pool) {
  const router = Router();
  const handlers = createAttendantHandlers(db);

  router.get('/stations', authenticateJWT, setTenantContext, requireRole([UserRole.Attendant]), handlers.stations);
  router.get('/pumps', authenticateJWT, setTenantContext, requireRole([UserRole.Attendant]), handlers.pumps);
  router.get('/nozzles', authenticateJWT, setTenantContext, requireRole([UserRole.Attendant]), handlers.nozzles);
  router.get('/creditors', authenticateJWT, setTenantContext, requireRole([UserRole.Attendant]), handlers.creditors);
  router.post('/cash-report', authenticateJWT, setTenantContext, requireRole([UserRole.Attendant]), handlers.cashReport);

  return router;
}
