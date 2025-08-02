/**
 * @file controllers/reconciliation.improved.controller.ts
 * @description Simplified reconciliation controller with clear logic
 */
// Types handled by TypeScript compilation
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { successResponse } from '../utils/successResponse';
import { errorResponse } from '../utils/errorResponse';
import { 
  generateReconciliationSummary, 
  closeDayReconciliation 
} from '../services/reconciliation.improved.service';

export function createImprovedReconciliationHandlers(db: Pool) {
  return {
    /**
     * GET /api/v1/reconciliation/summary
     * Get reconciliation summary for a specific date and station
     */
    getReconciliationSummary: async (req: Request, res: Response) => {
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
     * Close the day after reviewing differences
     */
    closeDayReconciliation: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId || !user.userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { stationId, date, notes } = req.body;
        if (!stationId || !date) {
          return errorResponse(res, 400, 'Station ID and date are required');
        }

        // First get the summary to show what we're closing
        const summary = await generateReconciliationSummary(
          db,
          user.tenantId,
          stationId,
          date
        );

        if (summary.isReconciled) {
          return errorResponse(res, 400, 'Day is already closed');
        }

        // Close the day
        await closeDayReconciliation(
          db,
          user.tenantId,
          stationId,
          date,
          user.userId,
          notes
        );

        return successResponse(res, {
          message: 'Day closed successfully',
          summary: {
            ...summary,
            isReconciled: true,
            reconciledBy: user.userId,
            reconciledAt: new Date()
          }
        });
      } catch (error: any) {
        console.error('[RECONCILIATION] Error closing day:', error);
        return errorResponse(res, 500, error.message || 'Failed to close day');
      }
    },

    /**
     * GET /api/v1/reconciliation/history
     * Get reconciliation history for a station
     */
    getReconciliationHistory: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { stationId, startDate, endDate, limit = 30 } = req.query;
        
        let query = `
          SELECT 
            dr.date,
            dr.station_id,
            s.name as station_name,
            dr.total_sales,
            dr.cash_total,
            dr.card_total,
            dr.upi_total,
            dr.credit_total,
            dr.finalized,
            dr.closed_by,
            dr.closed_at,
            u.name as closed_by_name
          FROM day_reconciliations dr
          JOIN stations s ON dr.station_id = s.id
          LEFT JOIN users u ON dr.closed_by = u.id
          WHERE dr.tenant_id = $1
        `;
        
        const params: any[] = [user.tenantId];
        let paramIndex = 2;

        if (stationId) {
          query += ` AND dr.station_id = $${paramIndex++}`;
          params.push(stationId);
        }

        if (startDate) {
          query += ` AND dr.date >= $${paramIndex++}`;
          params.push(startDate);
        }

        if (endDate) {
          query += ` AND dr.date <= $${paramIndex++}`;
          params.push(endDate);
        }

        query += ` ORDER BY dr.date DESC, s.name LIMIT $${paramIndex}`;
        params.push(Number(limit));

        const result = await db.query(query, params);

        const history = result.rows.map(row => ({
          date: row.date,
          stationId: row.station_id,
          stationName: row.station_name,
          systemCalculated: {
            totalRevenue: Number(row.total_sales),
            cashSales: Number(row.cash_total),
            cardSales: Number(row.card_total),
            upiSales: Number(row.upi_total),
            creditSales: Number(row.credit_total)
          },
          isReconciled: row.finalized,
          reconciledBy: row.closed_by_name,
          reconciledAt: row.closed_at
        }));

        return successResponse(res, history);
      } catch (error: any) {
        console.error('[RECONCILIATION] Error getting history:', error);
        return errorResponse(res, 500, error.message || 'Failed to get reconciliation history');
      }
    },

    /**
     * GET /api/v1/reconciliation/dashboard
     * Get reconciliation dashboard data
     */
    getReconciliationDashboard: async (req: Request, res: Response) => {
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

        const dashboard = {
          today: today,
          stations: [] as any[],
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
              userTotal: summary.userEntered.totalCollected
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
