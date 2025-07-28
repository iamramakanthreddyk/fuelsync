import { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  runReconciliation,
  getReconciliation,
  listReconciliations,
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
          WITH ordered_readings AS (
            SELECT
              nr.nozzle_id,
              n.nozzle_number,
              n.fuel_type,
              nr.reading as current_reading,
              LAG(nr.reading) OVER (PARTITION BY nr.nozzle_id ORDER BY nr.recorded_at) as previous_reading,
              nr.payment_method,
              nr.recorded_at,
              fp_lateral.price as price_per_litre
            FROM public.nozzle_readings nr
            JOIN public.nozzles n ON nr.nozzle_id = n.id
            JOIN public.pumps p ON n.pump_id = p.id
            LEFT JOIN LATERAL (
              SELECT price
              FROM public.fuel_prices fp
              WHERE fp.station_id = p.station_id
                AND fp.fuel_type = n.fuel_type
                AND fp.tenant_id = $3::uuid
                AND fp.valid_from <= nr.recorded_at
                AND (fp.effective_to IS NULL OR fp.effective_to > nr.recorded_at)
              ORDER BY fp.valid_from DESC
              LIMIT 1
            ) fp_lateral ON true
            WHERE p.station_id = $1::uuid
              AND nr.tenant_id = $3::uuid
              AND DATE(nr.recorded_at) = $2::date
            ORDER BY nr.nozzle_id, nr.recorded_at
          ),
          cash_declared AS (
            SELECT COALESCE(SUM(cash_amount), 0) as total_cash
            FROM public.cash_reports cr
            WHERE cr.station_id = $1::uuid
              AND cr.tenant_id = $3::uuid
              AND DATE(cr.reported_at) = $2::date
          )
          SELECT
            nozzle_id,
            nozzle_number,
            fuel_type,
            COALESCE(previous_reading, 0) as previous_reading,
            current_reading,
            GREATEST(current_reading - COALESCE(previous_reading, 0), 0) as delta_volume,
            COALESCE(price_per_litre, 0) as price_per_litre,
            GREATEST(current_reading - COALESCE(previous_reading, 0), 0) * COALESCE(price_per_litre, 0) as sale_value,
            payment_method,
            (SELECT total_cash FROM cash_declared) as cash_declared
          FROM ordered_readings
        `;

        console.log('[DAILY-SUMMARY] Query params:', [stationId, date, tenantId]);
        const result = await db.query(query, [stationId, date, tenantId]);
        
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
    }
  };
}
