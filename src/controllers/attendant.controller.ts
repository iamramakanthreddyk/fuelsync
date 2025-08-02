// Types handled by TypeScript compilation
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { listCreditors } from '../services/creditor.service';
import { parseRows } from '../utils/parseDb';

export function createAttendantHandlers(db: Pool) {
  return {
    // Health check endpoint
    healthCheck: async (_req: Request, res: Response) => {
      try {
        successResponse(res, { status: 'ok', timestamp: new Date().toISOString() });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Health check failed');
      }
    },
    
    // Get stations for attendant
    stations: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // For now, just return a placeholder response
        successResponse(res, { stations: [] });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Failed to fetch stations');
      }
    },
    
    // Get pumps for attendant
    pumps: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // For now, just return a placeholder response
        successResponse(res, { pumps: [] });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Failed to fetch pumps');
      }
    },
    
    // Get nozzles for attendant
    nozzles: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // For now, just return a placeholder response
        successResponse(res, { nozzles: [] });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Failed to fetch nozzles');
      }
    },
    
    // Get creditors for attendant
    creditors: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // Get stationId from query params
        const stationId = req.query.stationId as string;
        
        // Log for debugging
        console.log(`[ATTENDANT-API] Fetching creditors for tenant ${tenantId}, station ${stationId || 'all'}`);
        
        // Get creditors for the tenant, filtered by station if provided
        const creditors = await listCreditors(db, tenantId, stationId);
        
        if (creditors.length === 0) {
          return successResponse(res, { creditors: [] });
        }
        
        // Map to expected format
        const mappedCreditors = creditors.map(creditor => ({
          id: creditor.id,
          partyName: creditor.party_name,
          name: creditor.party_name,
          contactNumber: creditor.contact_number,
          address: creditor.address,
          creditLimit: Number(creditor.credit_limit),
          status: creditor.status,
          stationId: creditor.station_id,
          stationName: creditor.station_name,
          createdAt: creditor.created_at
        }));
        
        console.log(`[ATTENDANT-API] Found ${mappedCreditors.length} creditors for tenant ${tenantId}, station ${stationId || 'all'}`);
        successResponse(res, { creditors: mappedCreditors });
      } catch (err: any) {
        console.error('[ATTENDANT-API] Error fetching creditors:', err);
        return errorResponse(res, 500, err.message || 'Failed to fetch creditors');
      }
    },
    
    // Submit cash report
    cashReport: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const {
          stationId,
          cashAmount = 0,
          cardAmount = 0,
          upiAmount = 0,
          creditAmount = 0,
          shift = 'day',
          notes,
          date = new Date().toISOString().split('T')[0]
        } = req.body;

        if (!stationId) {
          return errorResponse(res, 400, 'Station ID is required');
        }

        // Validate amounts
        const cash = parseFloat(cashAmount) || 0;
        const card = parseFloat(cardAmount) || 0;
        const upi = parseFloat(upiAmount) || 0;
        const credit = parseFloat(creditAmount) || 0;
        const total = cash + card + upi + credit;

        if (total <= 0) {
          return errorResponse(res, 400, 'At least one amount must be greater than zero');
        }

        // Verify station exists and user has access
        const stationCheck = await db.query(
          'SELECT id FROM public.stations WHERE id = $1 AND tenant_id = $2',
          [stationId, tenantId]
        );

        if (stationCheck.rowCount === 0) {
          return errorResponse(res, 400, 'Invalid station ID');
        }

        // Insert cash report
        const reportId = randomUUID();
        const result = await db.query(`
          INSERT INTO public.cash_reports (
            id, tenant_id, station_id, user_id, date, shift,
            cash_amount, card_amount, upi_amount, credit_amount, total_amount,
            notes, status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'submitted', NOW(), NOW()
          )
          ON CONFLICT (tenant_id, station_id, user_id, date, shift)
          DO UPDATE SET
            cash_amount = EXCLUDED.cash_amount,
            card_amount = EXCLUDED.card_amount,
            upi_amount = EXCLUDED.upi_amount,
            credit_amount = EXCLUDED.credit_amount,
            total_amount = EXCLUDED.total_amount,
            notes = EXCLUDED.notes,
            updated_at = NOW()
          RETURNING id, total_amount
        `, [reportId, tenantId, stationId, userId, date, shift, cash, card, upi, credit, total, notes]);

        const report = result.rows[0];
        console.log(`[CASH-REPORT] Created/Updated: ${report.id} for station ${stationId}, total: ${report.total_amount}`);

        successResponse(res, {
          id: report.id,
          totalAmount: report.total_amount,
          message: 'Cash report submitted successfully'
        }, 'Cash report submitted successfully', 201);
      } catch (err: any) {
        console.error('[CASH-REPORT] Error:', err);
        return errorResponse(res, 500, err.message || 'Failed to submit cash report');
      }
    },
    
    // Get cash reports
    cashReports: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        
        if (!tenantId || !userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        const { listCashReports } = await import('../services/cashReport.service');
        const reports = await listCashReports(db, tenantId, userId, userRole);
        
        successResponse(res, { reports });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Failed to fetch cash reports');
      }
    },
    
    // Get alerts
    alerts: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // For now, just return a placeholder response
        successResponse(res, { alerts: [] });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Failed to fetch alerts');
      }
    },
    
    // Acknowledge alert
    acknowledgeAlert: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // For now, just return a placeholder response
        successResponse(res, { status: 'ok' });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Failed to acknowledge alert');
      }
    },
  };
}