import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createUser, listUsers } from '../services/user.service';
import { validateTenantUser } from '../validators/user.validator';
import { errorResponse } from '../utils/errorResponse';

export function createUserHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId || (req.headers['x-tenant-id'] as string);
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const { email, password, role, stationIds } = validateTenantUser(req.body);
        const id = await createUser(db, tenantId, email, password, role, stationIds);
        res.status(201).json({ id });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId || (req.headers['x-tenant-id'] as string);
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      const users = await listUsers(db, tenantId);
      res.json({ users });
    },
  };
}
