import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getTenantSettings, upsertTenantSettings } from '../services/settings.service';
import { validateUpdateSettings } from '../validators/settings.validator';
import { errorResponse } from '../utils/errorResponse';

export function createSettingsHandlers(db: Pool) {
  return {
    get: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      const settings = await getTenantSettings(db, tenantId);
      res.json({ settings });
    },
    update: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const input = validateUpdateSettings(req.body);
        await upsertTenantSettings(db, tenantId, input);
        res.json({ status: 'ok' });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
  };
}
