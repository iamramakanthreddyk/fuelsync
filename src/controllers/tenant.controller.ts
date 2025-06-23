import { Request, Response } from 'express';
import { Pool } from 'pg';
import { listTenants, createTenant, getTenantsSummary } from '../services/tenant.service';
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
        const { name, schemaName, plan, ownerEmail, ownerPassword } = validateTenantInput(req.body);
        const id = await createTenant(db, name, schemaName, plan, ownerEmail, ownerPassword);
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
      const summary = await getTenantsSummary(db);
      res.json(summary);
    }
  };
}
