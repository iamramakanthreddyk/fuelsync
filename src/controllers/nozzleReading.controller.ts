import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createNozzleReading, listNozzleReadings, canCreateNozzleReading } from '../services/nozzleReading.service';
import { validateCreateNozzleReading, parseReadingQuery } from '../validators/nozzleReading.validator';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';

export function createNozzleReadingHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId || !user.userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreateNozzleReading(req.body);
        const id = await createNozzleReading(db, user.tenantId, data, user.userId);
        successResponse(res, { id }, undefined, 201);
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
        const readings = await listNozzleReadings(user.tenantId, {
          nozzleId: query.nozzleId,
          stationId: undefined,
          from: query.startDate,
          to: query.endDate
        });
        if (readings.length === 0) {
          return successResponse(res, []);
        }
        successResponse(res, { readings });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    canCreate: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const nozzleId = req.params.nozzleId;
        if (!user?.tenantId || !nozzleId) {
          return errorResponse(res, 400, 'nozzleId required');
        }
        const result = await canCreateNozzleReading(db, user.tenantId, nozzleId);
        successResponse(res, { canCreate: result.allowed, reason: result.reason });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
  };
}
