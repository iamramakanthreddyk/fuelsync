import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { enforceReportsAccess } from '../middlewares/roleBasedAccess';
import { UserRole } from '../constants/auth';
import { createReportsHandlers } from '../controllers/reports.controller';
// import { createCacheMiddleware } from '../optimizations/caching-middleware';

export function createReportsRouter(db: Pool) {
  const router = Router();
  const handlers = createReportsHandlers(db);

  // Create cache middleware for reports - DISABLED (Redis not available)
  // const reportCache = createCacheMiddleware({ ttl: 1800 }); // 30 minutes
  // const previewCache = createCacheMiddleware({ ttl: 300 }); // 5 minutes for previews
  const reportCache = (req: any, res: any, next: any) => next(); // No-op middleware
  const previewCache = (req: any, res: any, next: any) => next(); // No-op middleware

  // Cached routes for better performance (Pro+ only)
  router.get('/sales/export', authenticateJWT, enforceReportsAccess(db), requireRole([UserRole.Owner, UserRole.Manager]), reportCache, handlers.exportSales);
  router.get('/sales', authenticateJWT, enforceReportsAccess(db), requireRole([UserRole.Owner, UserRole.Manager]), reportCache, handlers.getSales);
  router.get('/preview', authenticateJWT, enforceReportsAccess(db), requireRole([UserRole.Owner, UserRole.Manager]), previewCache, handlers.getSales);

  // Non-cached routes (for generation/scheduling) (Pro+ only)
  router.post('/sales', authenticateJWT, enforceReportsAccess(db), requireRole([UserRole.Owner, UserRole.Manager]), handlers.exportSalesPost);
  router.post('/export', authenticateJWT, enforceReportsAccess(db), requireRole([UserRole.Owner, UserRole.Manager]), handlers.exportGeneric);
  router.post('/schedule', authenticateJWT, enforceReportsAccess(db), requireRole([UserRole.Owner, UserRole.Manager]), handlers.scheduleReport);
  router.get('/financial/export', authenticateJWT, enforceReportsAccess(db), requireRole([UserRole.Owner]), reportCache, handlers.exportFinancial);

  return router;
}