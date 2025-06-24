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
        console.log('Tenant creation request:', req.body);
        const { name, planId, schemaName } = validateTenantInput(req.body);
        console.log('Validated tenant input:', { name, planId, schemaName });
        
        // Get plan ID from name if needed
        let actualPlanId = planId;
        if (planId === 'basic' || planId === 'pro' || planId === 'premium') {
          const planResult = await db.query('SELECT id FROM public.plans WHERE name ILIKE $1', [`%${planId}%`]);
          if (planResult.rows.length > 0) {
            actualPlanId = planResult.rows[0].id;
            console.log(`Resolved plan ID for ${planId}:`, actualPlanId);
          } else {
            // Fallback to first plan if no match found
            const defaultPlanResult = await db.query('SELECT id FROM public.plans LIMIT 1');
            if (defaultPlanResult.rows.length > 0) {
              actualPlanId = defaultPlanResult.rows[0].id;
              console.log(`Using default plan ID:`, actualPlanId);
            } else {
              throw new Error('No plans found in the system');
            }
          }
        }
        
        const tenant = await createTenant(db, { name, planId: actualPlanId, schemaName });
        console.log('Tenant created:', tenant);
        
        res.status(201).json({ 
          id: tenant.id,
          name: tenant.name,
          schemaName: tenant.schemaName,
          status: tenant.status
        });
      } catch (err: any) {
        console.error('Error creating tenant:', err);
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
