import { Request, Response } from 'express';
import { Pool } from 'pg';
import { listTenants, createTenant } from '../services/tenant.service';
import { validateTenantInput } from '../validators/tenant.validator';
import { errorResponse } from '../utils/errorResponse';

export function createTenantHandlers(db: Pool) {
  return {
    list: async (_req: Request, res: Response) => {
      const tenants = await listTenants(db);
      res.json({ tenants });
    },
    create: async (req: Request, res: Response) => {
      try {
        const { name, planId } = validateTenantInput(req.body);
        const tenant = await createTenant(db, { name, planId });
        const id = tenant.id;
        res.status(201).json({ id });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    }
  };
}

export function createAdminTenantHandlers(db: Pool) {
  const base = createTenantHandlers(db);
  return {
    ...base,
    summary: async (_req: Request, res: Response) => {
      const tenants = await listTenants(db);
      res.json({ tenantCount: tenants.length });
    }
  };
}
