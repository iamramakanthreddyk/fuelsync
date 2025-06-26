import { Request, Response } from 'express';
import { Pool } from 'pg';
import prisma from '../utils/prisma';
import { validateCreateNozzle } from '../validators/nozzle.validator';
import { errorResponse } from '../utils/errorResponse';

export function createNozzleHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreateNozzle(req.body);
        const nozzle = await prisma.nozzle.create({
          data: {
            tenant_id: tenantId,
            pump_id: data.pumpId,
            nozzle_number: data.nozzleNumber,
            fuel_type: data.fuelType
          },
          select: { id: true }
        });
        res.status(201).json({ id: nozzle.id });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      const pumpId = req.query.pumpId as string | undefined;
      const nozzles = await prisma.nozzle.findMany({
        where: {
          tenant_id: tenantId,
          ...(pumpId ? { pump_id: pumpId } : {})
        },
        orderBy: { nozzle_number: 'asc' }
      });
      res.json({ nozzles });
    },
    get: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const nozzle = await prisma.nozzle.findFirst({
          where: { id: req.params.id, tenant_id: tenantId }
        });
        if (!nozzle) {
          return errorResponse(res, 404, 'Nozzle not found');
        }
        res.json(nozzle);
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
        const deleted = await prisma.nozzle.deleteMany({
          where: { id: req.params.id, tenant_id: tenantId }
        });
        if (!deleted.count) return errorResponse(res, 404, 'Nozzle not found');
        res.json({ status: 'ok' });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    update: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const { fuelType, status } = req.body;
        const updated = await prisma.nozzle.updateMany({
          where: { id: req.params.id, tenant_id: tenantId },
          data: {
            ...(fuelType !== undefined ? { fuel_type: fuelType } : {}),
            ...(status !== undefined ? { status } : {})
          }
        });
        if (!updated.count) return errorResponse(res, 404, 'Nozzle not found');
        const nozzle = await prisma.nozzle.findUnique({ where: { id: req.params.id } });
        res.json(nozzle);
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
  };
}
