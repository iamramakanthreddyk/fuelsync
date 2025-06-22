import { Router } from 'express';
import { Pool } from 'pg';
import { createAdminUserRouter } from './adminUser.route';

export function createAdminApiRouter(db: Pool) {
  const router = Router();
  router.use('/users', createAdminUserRouter(db));
  return router;
}
