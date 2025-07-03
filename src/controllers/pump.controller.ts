import { Request, Response } from 'express';
import { Pool } from 'pg';
import prisma from '../utils/prisma';
import { validateCreatePump } from '../validators/pump.validator';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { normalizeStationId } from '../utils/normalizeStationId';

export function createPumpHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreatePump(req.body);
        const pump = await prisma.pump.create({
          data: {
            tenant_id: tenantId,
            station_id: data.stationId,
            name: data.name,
            serial_number: data.serialNumber || null
          }
        });
        successResponse(res, { pump }, undefined, 201);
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      const stationId = normalizeStationId(req.query.stationId as string | undefined);
      const pumps = await prisma.pump.findMany({
        where: {
          tenant_id: tenantId,
          ...(stationId ? { station_id: stationId } : {})
        },
        orderBy: { name: 'asc' },
        include: { _count: { select: { nozzles: true } } }
      });
      successResponse(res, {
        pumps: pumps.map(p => ({
          ...p,
          nozzleCount: p._count.nozzles
        }))
      });
    },
    get: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const pump = await prisma.pump.findFirst({
          where: { id: req.params.id, tenant_id: tenantId }
        });
        if (!pump) {
          return errorResponse(res, 404, 'Pump not found');
        }
        successResponse(res, { pump });
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
        const pumpId = req.params.id;
        const nozzleCount = await prisma.nozzle.count({ where: { pump_id: pumpId, tenant_id: tenantId } });
        if (nozzleCount > 0) {
          return errorResponse(res, 400, 'Cannot delete pump with nozzles');
        }
        const deleted = await prisma.pump.deleteMany({ where: { id: pumpId, tenant_id: tenantId } });
        if (!deleted.count) return errorResponse(res, 404, 'Pump not found');
        successResponse(res, { status: 'ok' });
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
        const { name, serialNumber } = req.body;
        const updated = await prisma.pump.updateMany({
          where: { id: req.params.id, tenant_id: tenantId },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(serialNumber !== undefined ? { serial_number: serialNumber } : {})
          }
        });
        if (!updated.count) return errorResponse(res, 404, 'Pump not found');
        const pump = await prisma.pump.findUnique({ where: { id: req.params.id } });
        successResponse(res, { pump });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
  };
}
