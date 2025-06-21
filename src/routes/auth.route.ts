import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { login } from '../services/auth.service';

export function createAuthRouter(db: Pool) {
  const router = Router();

  router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    const token = await login(db, email, password, tenantId);
    if (!token) {
      return res.status(401).json({ status: 'error', code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }
    return res.json({ token });
  });

  return router;
}
