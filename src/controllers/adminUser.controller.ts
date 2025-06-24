import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createAdminUser, listAdminUsers } from '../services/adminUser.service';
import { validateAdminUser } from '../validators/user.validator';
import { errorResponse } from '../utils/errorResponse';

export function createAdminUserHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const { email, password } = validateAdminUser(req.body);
        await createAdminUser(db, email, password);
        res.status(201).json({ status: 'ok' });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (_req: Request, res: Response) => {
      const users = await listAdminUsers(db);
      res.json({ users });
    },
    getAnalytics: async (_req: Request, res: Response) => {
      try {
        const summary = await db.query(`
          SELECT 
            (SELECT COUNT(*) FROM public.tenants) as total_tenants,
            (SELECT COUNT(*) FROM public.tenants WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_tenants
        `);
        res.json(summary.rows[0]);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
  };
}
