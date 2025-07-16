import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { setTenantContext } from '../middlewares/setTenantContext';
import { createNozzleReadingHandlers } from '../controllers/nozzleReading.controller';

export function createNozzleReadingRouter(db: Pool) {
  const router = Router();
  const handlers = createNozzleReadingHandlers(db);

  router.post('/', authenticateJWT, setTenantContext, handlers.create);
  router.get('/', authenticateJWT, setTenantContext, handlers.list);
  router.get('/can-create/:nozzleId', authenticateJWT, setTenantContext, handlers.canCreate);
  router.get('/:id', authenticateJWT, setTenantContext, handlers.get);
  router.put('/:id', authenticateJWT, setTenantContext, handlers.update);
  
  // Add void endpoint
  router.post('/:id/void', authenticateJWT, setTenantContext, handlers.voidReading);

  return router;
}