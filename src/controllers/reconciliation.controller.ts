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
        if (!summary) {
          return errorResponse(res, 404, 'Not found');
        }
        successResponse(res, { summary });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    getDailySummary: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        const { stationId, date } = req.query as { stationId?: string; date?: string };
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        if (!stationId || !date) {
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
                AND fp.tenant_id = $3
                AND fp.valid_from <= nr.recorded_at
                AND (fp.effective_to IS NULL OR fp.effective_to > nr.recorded_at)
              ORDER BY fp.valid_from DESC
              LIMIT 1
            ) fp_lateral ON true
            WHERE p.station_id = $1
              AND nr.tenant_id = $3
            ORDER BY nr.nozzle_id, nr.recorded_at
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
            CASE WHEN payment_method = 'cash' THEN GREATEST(current_reading - COALESCE(previous_reading, 0), 0) * COALESCE(price_per_litre, 0) ELSE 0 END as cash_declared
          FROM ordered_readings
          WHERE DATE(recorded_at) = $2
        `;

        const result = await db.query(query, [stationId, date, tenantId]);

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

        successResponse(res, summary);
      } catch (err: any) {
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
          `SELECT dr.*, s.name as station_name 
           FROM public.day_reconciliations dr
           JOIN public.stations s ON dr.station_id = s.id
           WHERE dr.id = $1 AND dr.tenant_id = $2`,
          [id, user.tenantId]
        );
        if (!result.rowCount) {
          return errorResponse(res, 404, 'Reconciliation not found');
        }
        successResponse(res, result.rows[0]);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    approve: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const id = req.params.id;
        await db.query(
          'UPDATE public.day_reconciliations SET finalized = true, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
          [id, tenantId]
        );
        successResponse(res, {}, 'Reconciliation approved');
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}
