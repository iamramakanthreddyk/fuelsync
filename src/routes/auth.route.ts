import { Router } from 'express';
import { Pool } from 'pg';
import { createAuthController } from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/authenticateJWT';

export function createAuthRouter(db: Pool) {
  const router = Router();
  const controller = createAuthController(db);

  router.post('/login', controller.login);
  router.post('/logout', authenticateJWT, controller.logout);
  router.post('/refresh', authenticateJWT, controller.refreshToken);
  
  // Add a simple test endpoint
  router.get('/test', (_req, res) => {
    console.log('[AUTH-ROUTE] Test endpoint called');
    return res.json({ status: 'ok', message: 'Auth API is working' });
  });

  return router;
}
