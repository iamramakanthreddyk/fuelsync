import { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  getDailySummary,
  getOpenDays,
  isDayClosed,
  validateClosureAttempt,
  DailyClosureData
} from '../services/dailyClosure.service';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';

export function createDailyClosureHandlers(db: Pool) {
  return {
    // GET /daily-closure/summary/:stationId/:date
    getSummary: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { stationId, date } = req.params;
        if (!stationId || !date) {
          return errorResponse(res, 400, 'Station ID and date are required');
        }

        const summary = await getDailySummary(db, tenantId, stationId, date);
        successResponse(res, summary);
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },

    // POST /daily-closure/validate - Validate closure attempt
    validateClosure: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { stationId, closureDate, reportedCashAmount } = req.body;
        if (!stationId || !closureDate || reportedCashAmount === undefined) {
          return errorResponse(res, 400, 'Missing required fields');
        }

        const validation = await validateClosureAttempt(
          db, tenantId, stationId, closureDate, Number(reportedCashAmount)
        );
        
        successResponse(res, validation);
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },

    // POST /daily-closure/close
    closeBusiness: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId || !user.userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        // Only managers and owners can close business days
        if (user.role !== 'manager' && user.role !== 'owner') {
          return errorResponse(res, 403, 'Only managers and owners can close business days');
        }

        const data: DailyClosureData = {
          stationId: req.body.stationId,
          closureDate: req.body.closureDate,
          reportedCashAmount: Number(req.body.reportedCashAmount),
          varianceReason: req.body.varianceReason
        };

        if (!data.stationId || !data.closureDate || isNaN(data.reportedCashAmount)) {
          return errorResponse(res, 400, 'Invalid closure data');
        }

        // Pre-validate closure attempt
        const validation = await validateClosureAttempt(
          db, user.tenantId, data.stationId, data.closureDate, data.reportedCashAmount
        );
        
        if (!validation.valid) {
          return errorResponse(res, 400, validation.errors.join('; '));
        }

        const id = await closeDailyBusiness(db, user.tenantId, data, user.userId);
        successResponse(res, { 
          id, 
          warnings: validation.warnings 
        }, 'Business day closed successfully');
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },

    // GET /daily-closure/open
    getOpenDays: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const stationId = req.query.stationId as string;
        const openDays = await getOpenDays(db, tenantId, stationId);
        successResponse(res, { openDays });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },

    // GET /daily-closure/check/:stationId/:date
    checkClosed: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { stationId, date } = req.params;
        if (!stationId || !date) {
          return errorResponse(res, 400, 'Station ID and date are required');
        }

        const isClosed = await isDayClosed(db, tenantId, stationId, date);
        successResponse(res, { isClosed, date, stationId });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    }
  };
}