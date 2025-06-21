import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createFuelPrice, listFuelPrices } from '../services/fuelPrice.service';
import { validateCreateFuelPrice, parseFuelPriceQuery } from '../validators/fuelPrice.validator';

export function createFuelPriceHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const data = validateCreateFuelPrice(req.body);
        const id = await createFuelPrice(db, tenantId, data);
        res.status(201).json({ id });
      } catch (err: any) {
        res.status(400).json({ status: 'error', message: err.message });
      }
    },
    list: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
      }
      const query = parseFuelPriceQuery(req.query);
      const prices = await listFuelPrices(db, tenantId, query);
      res.json({ prices });
    },
  };
}
