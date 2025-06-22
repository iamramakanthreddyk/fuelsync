import { Request, Response } from 'express';
import { Pool } from 'pg';
import { login } from '../services/auth.service';
import { errorResponse } from '../utils/errorResponse';

export function createAuthController(db: Pool) {
  return {
    login: async (req: Request, res: Response) => {
      const { email, password } = req.body as { email: string; password: string };
      const tenantId = req.headers['x-tenant-id'] as string | undefined;
      const token = await login(db, email, password, tenantId);
      if (!token) {
        return errorResponse(res, 401, 'Invalid email or password');
      }
      return res.json({ token });
    },
  };
}
