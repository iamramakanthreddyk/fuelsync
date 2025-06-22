import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createFuelDelivery, listFuelDeliveries } from '../services/delivery.service';
import { validateCreateDelivery, parseDeliveryQuery } from '../validators/delivery.validator';
import { errorResponse } from '../utils/errorResponse';

export function createDeliveryHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreateDelivery(req.body);
        const id = await createFuelDelivery(db, tenantId, data);
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
      const query = parseDeliveryQuery(req.query);
      const deliveries = await listFuelDeliveries(db, tenantId, query);
      res.json({ deliveries });
    },
    inventory: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      try {
        const { stationId, fuelType } = req.query;
        const client = await db.connect();
        let query = `SELECT station_id, fuel_type, current_volume, updated_at FROM ${tenantId}.fuel_inventory WHERE 1=1`;
        const params: any[] = [];
        
        if (stationId) {
          params.push(stationId);
          query += ` AND station_id = ${params.length}`;
        }
        if (fuelType) {
          params.push(fuelType);
          query += ` AND fuel_type = ${params.length}`;
        }
        
        const { rows } = await client.query(query, params);
        client.release();
        res.json({ inventory: rows });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
  };
}
