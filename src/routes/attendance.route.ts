import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { setTenantContext } from '../middlewares/setTenantContext';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createAttendanceHandlers } from '../controllers/attendance.controller';

export function createAttendanceRouter(db: Pool) {
  const router = Router();
  const handlers = createAttendanceHandlers(db);

  // Get attendance records for a specific date
  router.get('/', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.getAttendance);
  
  // Get shifts for a specific date
  router.get('/shifts', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.getShifts);

  return router;
}