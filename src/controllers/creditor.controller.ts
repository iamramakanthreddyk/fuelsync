// Types handled by TypeScript compilation
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { ServiceError } from '../errors/ServiceError';
import prisma from '../utils/prisma';

// Handles creditor CRUD endpoints for the frontend
import {
  createCreditor,
  listCreditors,
  updateCreditor,
  markCreditorInactive,
  createCreditPayment,
  listCreditPayments,
} from '../services/creditor.service';
import {
  validateCreateCreditor,
  validateUpdateCreditor,
  validateCreatePayment,
  parsePaymentQuery,
} from '../validators/creditor.validator';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';

export function createCreditorHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreateCreditor(req.body);
        const id = await createCreditor(db, tenantId, data);
        successResponse(res, { id }, undefined, 201);
      } catch (err: any) {
        if (err instanceof ServiceError) {
          return errorResponse(res, err.code, err.message);
        }
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // Get stationId from query params if provided and validate it's a string
        let stationId: string | undefined = undefined;
        if (req.query.stationId) {
          if (typeof req.query.stationId === 'string') {
            stationId = req.query.stationId;
          } else {
            console.warn(`Invalid stationId type: ${typeof req.query.stationId}. Expected string.`);
            return errorResponse(res, 400, 'Invalid stationId format');
          }
        }
        
        const creditors = await listCreditors(db, tenantId, stationId);
        if (creditors.length === 0) {
          return successResponse(res, []);
        }
        // Normalize creditor data with balance and utilization
        const normalizedCreditors = creditors.map(creditor => ({
          ...creditor,
          balance: Number(creditor.current_balance || 0),
          currentBalance: Number(creditor.current_balance || 0),
          creditUtilization: Number(creditor.credit_utilization || 0)
        }));
        
        successResponse(res, { creditors: normalizedCreditors });
      } catch (err: any) {
        console.error('[CREDITOR-CONTROLLER] Error listing creditors:', err);
        return errorResponse(res, 500, err.message || 'Failed to list creditors');
      }
    },

    get: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const creditor = await prisma.creditor.findFirst({
          where: { id: req.params.id, tenant_id: tenantId },
          include: {
            station: true // Include station details
          }
        });
        if (!creditor) return errorResponse(res, 404, 'Creditor not found');
        
        // Get station details if available
        const stationName = creditor.station ? creditor.station.name : null;
        
        successResponse(res, {
          id: creditor.id,
          name: creditor.party_name,
          partyName: creditor.party_name,
          party_name: creditor.party_name,
          contactNumber: creditor.contact_number,
          contact_number: creditor.contact_number,
          address: creditor.address,
          status: creditor.status,
          creditLimit: Number(creditor.credit_limit),
          credit_limit: Number(creditor.credit_limit),
          balance: await require('../services/creditor.service').getCreditorBalance(db, tenantId, creditor.id),
          currentBalance: await require('../services/creditor.service').getCreditorBalance(db, tenantId, creditor.id),
          creditUtilization: Number(creditor.credit_limit) > 0 ? (await require('../services/creditor.service').getCreditorBalance(db, tenantId, creditor.id) / Number(creditor.credit_limit)) * 100 : 0,
          stationId: creditor.station_id,
          station_id: creditor.station_id,
          stationName: stationName,
          station_name: stationName,
          createdAt: creditor.created_at,
          created_at: creditor.created_at
        });
      } catch (err: any) {
        if (err instanceof ServiceError) {
          return errorResponse(res, err.code, err.message);
        }
        return errorResponse(res, 400, err.message);
      }
    },
    update: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateUpdateCreditor(req.body);
        await updateCreditor(db, tenantId, req.params.id, data);
        successResponse(res, { status: 'ok' });
      } catch (err: any) {
        if (err instanceof ServiceError) {
          return errorResponse(res, err.code, err.message);
        }
        return errorResponse(res, 400, err.message);
      }
    },
    remove: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        await markCreditorInactive(db, tenantId, req.params.id);
        successResponse(res, { status: 'ok' });
      } catch (err: any) {
        if (err instanceof ServiceError) {
          return errorResponse(res, err.code, err.message);
        }
        return errorResponse(res, 400, err.message);
      }
    },
    createPayment: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId || !user.id) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreatePayment(req.body);
        const id = await createCreditPayment(db, user.tenantId, data, user.id);
        successResponse(res, { id }, undefined, 201);
      } catch (err: any) {
        if (err instanceof ServiceError) {
          return errorResponse(res, err.code, err.message);
        }
        return errorResponse(res, 400, err.message);
      }
    },
    listPayments: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const query = parsePaymentQuery(req.query);
        const payments = await listCreditPayments(db, tenantId, query);
        if (payments.length === 0) {
          return successResponse(res, []);
        }
        successResponse(res, { payments });
      } catch (err: any) {
        if (err instanceof ServiceError) {
          return errorResponse(res, err.code, err.message);
        }
        return errorResponse(res, 400, err.message);
      }
    },
  }
}
