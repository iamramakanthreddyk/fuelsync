import { Request, Response } from 'express';
import { Pool } from 'pg';
import prisma from '../utils/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { validateCreateNozzle, validateUpdateNozzle } from '../validators/nozzle.validator';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { getNozzleSettings, updateNozzleSettings } from '../services/nozzleSettings.service';
import { canCreateNozzleReading } from '../services/nozzleReading.service';

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
            fuel_type: data.fuelType,
            status: data.status || 'active'
          }
        });
        successResponse(res, nozzle, undefined, 201);
      } catch (err: any) {
        if (
          err instanceof PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          return errorResponse(
            res,
            409,
            'Nozzle number already exists for this pump.'
          );
        }
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      const pumpId = req.query.pumpId as string | undefined;
      const nozzlesRaw = await prisma.nozzle.findMany({
        where: {
          tenant_id: tenantId,
          ...(pumpId ? { pump_id: pumpId } : {})
        },
        include: { pump: { select: { name: true } } },
        orderBy: { nozzle_number: 'asc' }
      });
      if (nozzlesRaw.length === 0) {
        return successResponse(res, []);
      }
      const nozzles = nozzlesRaw.map(n => ({
        id: n.id,
        pumpId: n.pump_id,
        pumpName: n.pump?.name || '',
        nozzleNumber: n.nozzle_number,
        fuelType: n.fuel_type,
        status: n.status,
        createdAt: n.created_at
      }));
      successResponse(res, { nozzles });
    },
    get: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const nozzle = await prisma.nozzle.findFirst({
          where: { id: req.params.id, tenant_id: tenantId },
          include: { pump: { select: { name: true } } }
        });
        if (!nozzle) {
          return errorResponse(res, 404, 'Nozzle not found');
        }
        successResponse(res, {
          nozzle: {
            id: nozzle.id,
            pumpId: nozzle.pump_id,
            pumpName: nozzle.pump?.name || '',
            nozzleNumber: nozzle.nozzle_number,
            fuelType: nozzle.fuel_type,
            status: nozzle.status,
            createdAt: nozzle.created_at,
          }
        });
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
        const { fuelType, status } = validateUpdateNozzle(req.body);
        const updated = await prisma.nozzle.updateMany({
          where: { id: req.params.id, tenant_id: tenantId },
          data: {
            ...(fuelType !== undefined ? { fuel_type: fuelType } : {}),
            ...(status !== undefined ? { status } : {})
          }
        });
        if (!updated.count) return errorResponse(res, 404, 'Nozzle not found');
        const nozzle = await prisma.nozzle.findUnique({ where: { id: req.params.id } });
        successResponse(res, { nozzle });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    getSettings: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      const settings = await getNozzleSettings(db, req.params.id);
      successResponse(res, { settings });
    },
    updateSettings: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      await updateNozzleSettings(db, req.params.id, req.body);
      const settings = await getNozzleSettings(db, req.params.id);
      successResponse(res, { settings });
    },
    canCreateReading: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const nozzleId = req.params.id;
        if (!user?.tenantId || !nozzleId) {
          return errorResponse(res, 400, 'nozzleId required');
        }
        const result = await canCreateNozzleReading(db, user.tenantId, nozzleId);
        successResponse(res, {
          canCreate: result.allowed,
          reason: result.reason,
          missingPrice: (result as any).missingPrice,
        });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
  };
}
