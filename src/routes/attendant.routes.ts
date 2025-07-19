import express from 'express';
import { Pool } from 'pg';
import { createAttendantHandlers } from '../controllers/attendant.controller';
import { requireAuth } from '../middleware/auth';

export function createAttendantRouter(db: Pool) {
  const router = express.Router();
  const handlers = createAttendantHandlers(db);

  // Apply auth middleware to all routes
  router.use(requireAuth);

  // Creditors endpoint - ignores stationId parameter but keeps it for API compatibility
  router.get('/creditors', handlers.getCreditors);

  return router;
}