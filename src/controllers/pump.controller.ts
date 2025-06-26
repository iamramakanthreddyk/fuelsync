import { Request, Response } from 'express';
import { Pool } from 'pg';
import prisma from '../utils/prisma';
import { validateCreatePump } from '../validators/pump.validator';
import { errorResponse } from '../utils/errorResponse';

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
            label: data.label,
            serial_number: data.serialNumber || null
          },
          select: { id: true }
        });
        res.status(201).json({ id: pump.id });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      const stationId = req.query.stationId as string | undefined;
      const pumps = await prisma.pump.findMany({
        where: {
          tenant_id: tenantId,
          ...(stationId ? { station_id: stationId } : {})
        },
        orderBy: { label: 'asc' },
        include: { _count: { select: { nozzles: true } } }
      });
      res.json({ pumps: pumps.map(p => ({
        ...p,
        nozzleCount: p._count.nozzles
      })) });
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
        res.json(pump);
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
        const { label, serialNumber } = req.body;
        const updated = await prisma.pump.updateMany({
          where: { id: req.params.id, tenant_id: tenantId },
          data: {
            ...(label !== undefined ? { label } : {}),
            ...(serialNumber !== undefined ? { serial_number: serialNumber } : {})
          }
        });
        if (!updated.count) return errorResponse(res, 404, 'Pump not found');
        const pump = await prisma.pump.findUnique({ where: { id: req.params.id } });
        res.json(pump);
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
  };
}
