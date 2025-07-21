import express from 'express';
import { Pool } from 'pg';
import { createAttendantHandlers } from '../controllers/attendant.controller';
import { authenticateJWT as requireAuth } from '../middlewares/authenticateJWT';

export function createAttendantRouter(db: Pool) {
  const router = express.Router();
  const handlers = createAttendantHandlers(db);

  // Apply auth middleware to all routes
  router.use(requireAuth);

  // Add all attendant routes
  router.get('/health-check', handlers.healthCheck);
  router.get('/stations', handlers.stations);
  router.get('/pumps', handlers.pumps);
  router.get('/nozzles', handlers.nozzles);
  router.get('/creditors', handlers.creditors);
  router.post('/cash-report', handlers.cashReport);
  router.get('/cash-reports', handlers.cashReports);
  router.get('/alerts', handlers.alerts);
  router.put('/alerts/:id/acknowledge', handlers.acknowledgeAlert);

  return router;
}