// Types handled by TypeScript compilation
import { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  createNozzleReading,
  listNozzleReadings,
  canCreateNozzleReading,
  getNozzleReading,
  updateNozzleReading,
  voidNozzleReading,
} from '../services/nozzleReading.service';
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
        const reading = await createNozzleReading(db, user.tenantId, data, user.userId);
        successResponse(res, reading, undefined, 201);
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId || typeof user.tenantId !== 'string' || user.tenantId.trim() === '') {
          return errorResponse(res, 400, 'Missing or invalid tenant context');
        }
        
        const query = parseReadingQuery(req.query);
        
        try {
          const readings = await listNozzleReadings(user.tenantId, {
            nozzleId: query.nozzleId,
            stationId: query.stationId,
            from: query.startDate,
            to: query.endDate,
            limit: query.limit,
          });
          
          // Always return readings in a consistent format
          successResponse(res, { readings });
        } catch (dbError: any) {
          console.error('[NOZZLE-READING] Database error:', dbError);
          // Let the outer catch block handle all errors
          throw dbError;
        }
      } catch (err: any) {
        console.error('[NOZZLE-READING] Error listing readings:', err);
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
        successResponse(res, {
          canCreate: result.allowed,
          reason: result.reason,
          missingPrice: (result as any).missingPrice,
        });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    get: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const id = req.params.id;
        if (!user?.tenantId || !id) {
          return errorResponse(res, 400, 'id required');
        }
        const reading = await getNozzleReading(db, user.tenantId, id);
        if (!reading) {
          return errorResponse(res, 404, 'Reading not found');
        }
        successResponse(res, reading);
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    update: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const id = req.params.id;
        if (!user?.tenantId || !id) {
          return errorResponse(res, 400, 'id required');
        }
        
        // Only allow managers and owners to update readings
        if (user.role !== 'manager' && user.role !== 'owner') {
          return errorResponse(res, 403, 'Only managers and owners can update readings');
        }
        
        const updatedId = await updateNozzleReading(db, user.tenantId, id, req.body);
        if (!updatedId) {
          return errorResponse(res, 400, 'No fields to update');
        }
        successResponse(res, { id: updatedId });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    
    voidReading: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const id = req.params.id;
        const { reason } = req.body;
        
        if (!user?.tenantId || !id) {
          return errorResponse(res, 400, 'id required');
        }
        
        if (!reason) {
          return errorResponse(res, 400, 'reason required');
        }
        
        // Only allow managers and owners to void readings
        if (user.role !== 'manager' && user.role !== 'owner') {
          return errorResponse(res, 403, 'Only managers and owners can void readings');
        }
        
        const result = await voidNozzleReading(db, user.tenantId, id, reason, user.userId);
        successResponse(res, { id: result.id, status: 'voided' });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
  };
}
