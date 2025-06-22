import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createFuelPrice, listFuelPrices } from '../services/fuelPrice.service';
import { validateCreateFuelPrice, parseFuelPriceQuery } from '../validators/fuelPrice.validator';
import { errorResponse } from '../utils/errorResponse';

export function createFuelPriceHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreateFuelPrice(req.body);
        const id = await createFuelPrice(db, tenantId, data);
        res.status(201).json({ id });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      const query = parseFuelPriceQuery(req.query);
      const prices = await listFuelPrices(db, tenantId, query);
      res.json({ prices });
    },
  };
}
