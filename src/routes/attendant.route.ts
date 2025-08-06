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

  // Public health check endpoint that doesn't require authentication
  router.get('/public-health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  
  // Simple test endpoint to verify the server is working
  router.get('/test', (req, res) => {
    res.status(200).json({ message: 'Test endpoint working' });
  });
  router.get('/health-check', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.healthCheck);
  router.get('/todays-summary', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.todaysSummary);
  router.get('/todays-sales', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.todaysSales);
  router.get('/stations', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.stations);
  router.get('/pumps', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.pumps);
  router.get('/nozzles', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.nozzles);
  router.get('/creditors', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.creditors);
  router.get('/readings', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.readings);
  router.post('/readings', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.createReading);
  // Cash report endpoint with better error handling
  router.post('/cash-report', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), (req, res) => {
    try {
      handlers.cashReport(req, res);
    } catch (err) {
      console.error('[CASH-REPORT-ROUTE] Unhandled error:', err);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  });
  router.get('/cash-reports', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.cashReports);
  router.get('/alerts', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.alerts);
  router.put('/alerts/:id/acknowledge', authenticateJWT, setTenantContext, requireRole([UserRole.Owner, UserRole.Manager, UserRole.Attendant]), handlers.acknowledgeAlert);

  return router;
}
