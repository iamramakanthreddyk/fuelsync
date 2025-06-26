import { Request, Response } from 'express';
import { Pool } from 'pg';
import prisma from '../utils/prisma';
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
        const price = await prisma.fuelPrice.create({
          data: {
            tenant_id: tenantId,
            station_id: data.stationId,
            fuel_type: data.fuelType,
            price: data.price,
            cost_price: data.costPrice || null,
            valid_from: data.effectiveFrom || new Date()
          },
          select: { id: true }
        });
        res.status(201).json({ id: price.id });
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
      const filters: any = { tenant_id: tenantId };
      if (query.stationId) filters.station_id = query.stationId;
      if (query.fuelType) filters.fuel_type = query.fuelType;
      const prices = await prisma.fuelPrice.findMany({
        where: filters,
        orderBy: { valid_from: 'desc' }
      });
      res.json({ prices });
    },

    update: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreateFuelPrice(req.body);
        const updated = await prisma.fuelPrice.updateMany({
          where: { id: req.params.id, tenant_id: tenantId },
          data: {
            station_id: data.stationId,
            fuel_type: data.fuelType,
            price: data.price,
            cost_price: data.costPrice || null,
            valid_from: data.effectiveFrom || new Date()
          }
        });
        if (!updated.count) return errorResponse(res, 404, 'Price not found');
        res.json({ status: 'updated' });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },

    remove: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const deleted = await prisma.fuelPrice.deleteMany({
          where: { id: req.params.id, tenant_id: tenantId }
        });
        if (!deleted.count) return errorResponse(res, 404, 'Price not found');
        res.json({ status: 'deleted' });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    }
  };
}
