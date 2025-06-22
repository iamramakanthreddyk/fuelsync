import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createFuelDelivery, listFuelDeliveries } from '../services/delivery.service';
import { validateCreateDelivery, parseDeliveryQuery } from '../validators/delivery.validator';

export function createDeliveryHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return res.status(400).json({ status: 'error', message: 'Missing tenant context' });
        }
        const data = validateCreateDelivery(req.body);
        const id = await createFuelDelivery(db, tenantId, data);
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
      const query = parseDeliveryQuery(req.query);
      const deliveries = await listFuelDeliveries(db, tenantId, query);
      res.json({ deliveries });
    },
  };
}
