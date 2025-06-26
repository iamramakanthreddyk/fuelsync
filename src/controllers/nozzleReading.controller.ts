import { Request, Response } from 'express';
import { Pool } from 'pg';
import prisma from '../utils/prisma';
import { validateCreateNozzleReading, parseReadingQuery } from '../validators/nozzleReading.validator';
import { errorResponse } from '../utils/errorResponse';

export function createNozzleReadingHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId || !user.userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreateNozzleReading(req.body);
        const reading = await prisma.nozzleReading.create({
          data: {
            tenant_id: user.tenantId,
            nozzle_id: data.nozzleId,
            reading: data.reading,
            recorded_at: data.recordedAt,
            payment_method: data.paymentMethod || null
          },
          select: { id: true }
        });
        res.status(201).json({ id: reading.id });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const query = parseReadingQuery(req.query);
        const filters: any = { tenant_id: user.tenantId };
        if (query.nozzleId) filters.nozzle_id = query.nozzleId;
        if (query.startDate) filters.recorded_at = { gte: query.startDate };
        if (query.endDate) filters.recorded_at = { ...filters.recorded_at, lte: query.endDate };
        const readings = await prisma.nozzleReading.findMany({
          where: filters,
          orderBy: { recorded_at: 'desc' }
        });
        res.json({ readings });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
  };
}
