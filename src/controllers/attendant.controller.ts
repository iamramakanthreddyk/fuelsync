import { Request, Response } from 'express';
import { Pool } from 'pg';
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
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // Validate stationId is present
        const { stationId, creditorId } = req.body;
        if (!stationId) {
          return errorResponse(res, 400, 'Station ID is required');
        }
        
        // If creditorId is provided, ensure it exists
        if (creditorId) {
          const creditor = await db.query(
            'SELECT id FROM public.creditors WHERE id = $1 AND tenant_id = $2',
            [creditorId, tenantId]
          );
          
          if (creditor.rowCount === 0) {
            return errorResponse(res, 400, 'Invalid creditor ID');
          }
          
          // Log the station and creditor for tracking
          console.log(`[ATTENDANT-API] Cash report with credit: stationId=${stationId}, creditorId=${creditorId}`);
        }
        
        // For now, just return a placeholder response
        successResponse(res, { id: 'placeholder-id' }, 'Cash report submitted successfully', 201);
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Failed to submit cash report');
      }
    },
    
    // Get cash reports
    cashReports: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // For now, just return a placeholder response
        successResponse(res, { reports: [] });
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