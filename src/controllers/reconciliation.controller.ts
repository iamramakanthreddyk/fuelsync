// Types handled by TypeScript compilation
import { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  runReconciliation,
  getReconciliation,
  listReconciliations,
  // NEW: Improved reconciliation functions
  generateReconciliationSummary,
  closeDayReconciliation,
  getReconciliationAnalytics,
} from '../services/reconciliation.service';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';

export function createReconciliationHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const { stationId, date } = req.body || {};
        if (!stationId || !date) {
          return errorResponse(res, 400, 'stationId and date required');
        }
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          return errorResponse(res, 400, 'Invalid date');
        }
        
        // Check if there are readings and sales data before running reconciliation
        const readingsQuery = `
          SELECT COUNT(*) as count FROM public.nozzle_readings nr
          JOIN public.nozzles n ON nr.nozzle_id = n.id
          JOIN public.pumps p ON n.pump_id = p.id
          WHERE p.station_id = $1::uuid
            AND DATE(nr.recorded_at) = $2::date
            AND nr.tenant_id = $3::uuid
        `;
        const readingsResult = await db.query(readingsQuery, [stationId, parsedDate, user.tenantId]);
        const readingsCount = parseInt(readingsResult.rows[0]?.count || '0');
        
        if (readingsCount === 0) {
          return errorResponse(res, 400, 'No readings found for this date. Please ensure readings are entered first.');
        }
        
        const summary = await runReconciliation(db, user.tenantId, stationId, parsedDate);
        successResponse(res, { summary }, undefined, 201);
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
        const { stationId } = req.query as { stationId?: string };
        const history = await listReconciliations(db, user.tenantId, stationId);
        successResponse(res, history);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    get: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const { stationId } = req.params;
        const dateStr = req.query.date as string;
        if (!stationId || !dateStr) {
          return errorResponse(res, 400, 'stationId and date required');
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          return errorResponse(res, 400, 'Invalid date');
        }
        const summary = await getReconciliation(db, user.tenantId, stationId, date);
        successResponse(res, { summary });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    getDailySummary: async (req: Request, res: Response) => {
      console.log('[DAILY-SUMMARY] Full request debug:', {
        query: req.query,
        user: req.user,
        headers: {
          authorization: req.headers.authorization ? 'Present' : 'Missing',
          'x-tenant-id': req.headers['x-tenant-id']
        }
      });
      
      try {
        const tenantId = req.user?.tenantId;
        const { stationId, date } = req.query as { stationId?: string; date?: string };
        
        console.log('[DAILY-SUMMARY] Extracted values:', { tenantId, stationId, date });
        
        if (!tenantId) {
          console.log('[DAILY-SUMMARY] Missing tenant context');
          return errorResponse(res, 400, 'Missing tenant context');
        }
        if (!stationId || !date) {
          console.log('[DAILY-SUMMARY] Missing required params');
          return errorResponse(res, 400, 'stationId and date are required');
        }

        const query = `
          SELECT
            nr.nozzle_id,
            n.nozzle_number,
            n.fuel_type,
            nr.reading as current_reading,
            0 as previous_reading,
            nr.reading as delta_volume,
            COALESCE(fp.price, 0) as price_per_litre,
            nr.reading * COALESCE(fp.price, 0) as sale_value,
            nr.payment_method,
            0 as cash_declared
          FROM public.nozzle_readings nr
          JOIN public.nozzles n ON nr.nozzle_id = n.id
          JOIN public.pumps p ON n.pump_id = p.id
          LEFT JOIN public.fuel_prices fp ON fp.station_id::text = p.station_id::text
            AND fp.fuel_type = n.fuel_type
            AND fp.tenant_id::text = $3
          WHERE p.station_id::text = $1
            AND nr.tenant_id::text = $3
            AND DATE(nr.recorded_at) = $2::date
          ORDER BY nr.nozzle_id, nr.recorded_at
        `;

        console.log('[DAILY-SUMMARY] Query params:', [stationId, date, tenantId]);
        
        // First, let's check if there are any readings for this station and date
        const debugQuery = `
          SELECT COUNT(*) as reading_count
          FROM public.nozzle_readings nr
          JOIN public.nozzles n ON nr.nozzle_id = n.id
          JOIN public.pumps p ON n.pump_id = p.id
          WHERE p.station_id::text = $1
            AND nr.tenant_id::text = $3
            AND DATE(nr.recorded_at) = $2::date
        `;
        
        const params = [String(stationId), String(date), String(tenantId)];
        const debugResult = await db.query(debugQuery, params);
        console.log('[DAILY-SUMMARY] Debug - readings found:', debugResult.rows[0]?.reading_count);
        
        const result = await db.query(query, params);
        
        console.log('[DAILY-SUMMARY] Result:', result.rows.length, 'rows');

        const summary = result.rows.map(row => ({
          nozzleId: row.nozzle_id,
          nozzleNumber: parseInt(row.nozzle_number),
          previousReading: parseFloat(row.previous_reading),
          currentReading: parseFloat(row.current_reading),
          deltaVolume: parseFloat(row.delta_volume),
          pricePerLitre: parseFloat(row.price_per_litre),
          saleValue: parseFloat(row.sale_value),
          paymentMethod: row.payment_method,
          cashDeclared: parseFloat(row.cash_declared),
          fuelType: row.fuel_type,
        }));

        console.log('[DAILY-SUMMARY] Sending:', summary.length, 'items');
        successResponse(res, summary);
      } catch (err: any) {
        console.error('[DAILY-SUMMARY] Error:', err);
        return errorResponse(res, 500, err.message);
      }
    },

    run: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const { stationId, date } = req.body || {};
        if (!stationId || !date) {
          return errorResponse(res, 400, 'stationId and date required');
        }
        const reconciliationDate = new Date(date);
        if (isNaN(reconciliationDate.getTime())) {
          return errorResponse(res, 400, 'Invalid date');
        }
        
        // Check if there are readings and sales data before running reconciliation
        const readingsQuery = `
          SELECT COUNT(*) as count FROM public.nozzle_readings nr
          JOIN public.nozzles n ON nr.nozzle_id = n.id
          JOIN public.pumps p ON n.pump_id = p.id
          WHERE p.station_id = $1::uuid
            AND DATE(nr.recorded_at) = $2::date
            AND nr.tenant_id = $3::uuid
        `;
        const readingsResult = await db.query(readingsQuery, [stationId, reconciliationDate, user.tenantId]);
        const readingsCount = parseInt(readingsResult.rows[0]?.count || '0');
        
        if (readingsCount === 0) {
          return errorResponse(res, 400, 'No readings found for this date. Please ensure readings are entered first.');
        }
        
        const result = await runReconciliation(db, user.tenantId, stationId, reconciliationDate);
        successResponse(res, result);
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },

    getById: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const { id } = req.params;
        const result = await db.query(
          `SELECT dr.*, s.name as station_name,
                  (dr.opening_reading > 0 OR dr.closing_reading > 0) AS has_readings,
                  (dr.total_sales > 0) AS has_sales 
           FROM public.day_reconciliations dr
           JOIN public.stations s ON dr.station_id = s.id
           WHERE dr.id = $1 AND dr.tenant_id = $2`,
          [id, user.tenantId]
        );
        if (!result.rowCount) {
          return errorResponse(res, 404, 'Reconciliation not found');
        }
        
        // Process the row to ensure finalized flag is correct
        const row = result.rows[0];
        const shouldBeFinalized = row.finalized && row.has_readings && row.has_sales;
        row.finalized = shouldBeFinalized;
        
        // Remove the helper fields
        delete row.has_readings;
        delete row.has_sales;
        
        successResponse(res, row);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    approve: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const id = req.params.id;
        
        // Check if reconciliation has valid data before approving
        const reconciliationQuery = `
          SELECT * FROM public.day_reconciliations 
          WHERE id = $1 AND tenant_id = $2
        `;
        const reconciliationResult = await db.query(reconciliationQuery, [id, tenantId]);
        
        if (!reconciliationResult.rowCount) {
          return errorResponse(res, 404, 'Reconciliation not found');
        }
        
        const reconciliation = reconciliationResult.rows[0];
        const hasReadings = Number(reconciliation.opening_reading) > 0 || Number(reconciliation.closing_reading) > 0;
        const hasSales = Number(reconciliation.total_sales) > 0;
        
        if (!hasReadings || !hasSales) {
          return errorResponse(res, 400, 'Cannot approve reconciliation with no readings or sales data');
        }
        
        await db.query(
          'UPDATE public.day_reconciliations SET finalized = true, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
          [id, tenantId]
        );
        successResponse(res, {}, 'Reconciliation approved');
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    // Enhanced reconciliation with cash closure
    closeWithCash: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId || !user.userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { stationId, date, reportedCashAmount, varianceReason } = req.body;
        if (!stationId || !date || reportedCashAmount === undefined) {
          return errorResponse(res, 400, 'Missing required fields');
        }

        // Import the enhanced function
        const { enhanceReconciliationWithCash } = await import('../services/dailyClosure.service');
        
        const reconciliationId = await enhanceReconciliationWithCash(
          db,
          user.tenantId,
          stationId,
          date,
          Number(reportedCashAmount),
          varianceReason || '',
          user.userId
        );

        successResponse(res, { id: reconciliationId }, 'Business day closed successfully');
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },

    // ============================================================================
    // IMPROVED RECONCILIATION HANDLERS - New "System vs Reality" approach
    // ============================================================================

    /**
     * GET /api/v1/reconciliation/summary
     * Get reconciliation summary for a specific date and station
     */
    getSummary: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { stationId, date } = req.query;
        if (!stationId || !date) {
          return errorResponse(res, 400, 'Station ID and date are required');
        }

        const summary = await generateReconciliationSummary(
          db,
          user.tenantId,
          stationId as string,
          date as string
        );

        return successResponse(res, summary);
      } catch (error: any) {
        console.error('[RECONCILIATION] Error getting summary:', error);
        return errorResponse(res, 500, error.message || 'Failed to get reconciliation summary');
      }
    },

    /**
     * POST /api/v1/reconciliation/close-day
     * Close the day after reviewing differences (supports backdated closures)
     */
    closeDay: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId || !user.userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { stationId, date, notes } = req.body;
        if (!stationId || !date) {
          return errorResponse(res, 400, 'Station ID and date are required');
        }

        // Close the day with improved logic
        const summary = await closeDayReconciliation(
          db,
          user.tenantId,
          stationId,
          date,
          user.userId,
          notes
        );

        return successResponse(res, {
          message: 'Day closed successfully',
          summary
        });
      } catch (error: any) {
        console.error('[RECONCILIATION] Error closing day:', error);
        return errorResponse(res, 500, error.message || 'Failed to close day');
      }
    },

    /**
     * GET /api/v1/reconciliation/analytics
     * Get reconciliation analytics for reports integration
     */
    getAnalytics: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { startDate, endDate, stationId } = req.query;

        const analytics = await getReconciliationAnalytics(
          db,
          user.tenantId,
          startDate as string,
          endDate as string,
          stationId as string
        );

        return successResponse(res, analytics);
      } catch (error: any) {
        console.error('[RECONCILIATION] Error getting analytics:', error);
        return errorResponse(res, 500, error.message || 'Failed to get reconciliation analytics');
      }
    },

    /**
     * GET /api/v1/reconciliation/dashboard
     * Get reconciliation dashboard data for all stations
     */
    getDashboard: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const today = new Date().toISOString().split('T')[0];

        // Get all stations for this tenant
        const stationsResult = await db.query(
          'SELECT id, name FROM stations WHERE tenant_id = $1 ORDER BY name',
          [user.tenantId]
        );

        const dashboard: {
          today: string;
          stations: Array<{
            id: string;
            name: string;
            hasData: boolean;
            isReconciled: boolean;
            totalDifference: number;
            systemTotal: number;
            userTotal: number;
            canCloseBackdated?: boolean;
            error?: string;
          }>;
          summary: {
            totalStations: number;
            reconciledToday: number;
            pendingReconciliation: number;
            totalDifferences: number;
          };
        } = {
          today: today,
          stations: [],
          summary: {
            totalStations: stationsResult.rows.length,
            reconciledToday: 0,
            pendingReconciliation: 0,
            totalDifferences: 0
          }
        };

        // Get reconciliation status for each station
        for (const station of stationsResult.rows) {
          try {
            const summary = await generateReconciliationSummary(
              db,
              user.tenantId,
              station.id,
              today
            );

            dashboard.stations.push({
              id: station.id,
              name: station.name,
              hasData: summary.systemCalculated.totalRevenue > 0 || summary.userEntered.totalCollected > 0,
              isReconciled: summary.isReconciled,
              totalDifference: summary.differences.totalDifference,
              systemTotal: summary.systemCalculated.totalRevenue - summary.systemCalculated.creditSales,
              userTotal: summary.userEntered.totalCollected,
              canCloseBackdated: summary.canCloseBackdated
            });

            if (summary.isReconciled) {
              dashboard.summary.reconciledToday++;
            } else if (summary.systemCalculated.totalRevenue > 0 || summary.userEntered.totalCollected > 0) {
              dashboard.summary.pendingReconciliation++;
            }

            dashboard.summary.totalDifferences += Math.abs(summary.differences.totalDifference);
          } catch (error) {
            console.error(`Error getting summary for station ${station.id}:`, error);
            // Add station with error status
            dashboard.stations.push({
              id: station.id,
              name: station.name,
              hasData: false,
              isReconciled: false,
              totalDifference: 0,
              systemTotal: 0,
              userTotal: 0,
              canCloseBackdated: false,
              error: 'Failed to load data'
            });
          }
        }

        return successResponse(res, dashboard);
      } catch (error: any) {
        console.error('[RECONCILIATION] Error getting dashboard:', error);
        return errorResponse(res, 500, error.message || 'Failed to get reconciliation dashboard');
      }
    }
  };
}
