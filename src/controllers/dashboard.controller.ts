import { Request, Response } from 'express';
import { Pool } from 'pg';
import { errorResponse } from '../utils/errorResponse';

export function createDashboardHandlers(db: Pool) {
  return {
    getSalesSummary: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        const range = (req.query.range as string) || 'monthly';

        let dateFilter = '';
        switch (range) {
          case 'daily':
            dateFilter = "AND s.recorded_at >= CURRENT_DATE";
            break;
          case 'weekly':
            dateFilter = "AND s.recorded_at >= CURRENT_DATE - INTERVAL '7 days'";
            break;
          case 'monthly':
            dateFilter = "AND s.recorded_at >= CURRENT_DATE - INTERVAL '30 days'";
            break;
          case 'yearly':
            dateFilter = "AND s.recorded_at >= CURRENT_DATE - INTERVAL '1 year'";
            break;
        }

        const query = `
          SELECT
            COALESCE(SUM(s.amount), 0) as total_sales,
            COALESCE(SUM(s.volume), 0) as total_volume,
            COUNT(s.id) as transaction_count
          FROM ${tenantId}.sales s
          WHERE 1=1 ${dateFilter}
        `;

        const result = await db.query(query);
        const row = result.rows[0];

        res.json({
          totalSales: parseFloat(row.total_sales),
          totalVolume: parseFloat(row.total_volume),
          transactionCount: parseInt(row.transaction_count),
          period: range
        });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    getPaymentMethodBreakdown: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;

        const query = `
          SELECT
            s.payment_method,
            SUM(s.amount) as amount,
            COUNT(*) as count
          FROM ${tenantId}.sales s
          WHERE s.recorded_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY s.payment_method
          ORDER BY amount DESC
        `;

        const result = await db.query(query);
        const totalAmount = result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

        const breakdown = result.rows.map(row => ({
          paymentMethod: row.payment_method,
          amount: parseFloat(row.amount),
          percentage: totalAmount > 0 ? (parseFloat(row.amount) / totalAmount) * 100 : 0
        }));

        res.json(breakdown);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    getFuelTypeBreakdown: async (_req: Request, res: Response) => {
      try {
        const tenantId = res.locals.user?.tenantId || res.req.user?.tenantId;

        const query = `
          SELECT
            s.fuel_type,
            SUM(s.volume) as volume,
            SUM(s.amount) as amount
          FROM ${tenantId}.sales s
          WHERE s.recorded_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY s.fuel_type
          ORDER BY amount DESC
        `;

        const result = await db.query(query);

        const breakdown = result.rows.map(row => ({
          fuelType: row.fuel_type,
          volume: parseFloat(row.volume),
          amount: parseFloat(row.amount)
        }));

        res.json(breakdown);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    getTopCreditors: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        const limit = parseInt(req.query.limit as string) || 5;

        const query = `
          SELECT
            c.id,
            c.party_name,
            COALESCE(SUM(s.amount) - COALESCE(SUM(cp.amount), 0), 0) as outstanding_amount,
            c.credit_limit
          FROM ${tenantId}.creditors c
          LEFT JOIN ${tenantId}.sales s ON c.id = s.creditor_id AND s.payment_method = 'credit'
          LEFT JOIN ${tenantId}.credit_payments cp ON c.id = cp.creditor_id
          WHERE c.status = 'active'
          GROUP BY c.id, c.party_name, c.credit_limit
          HAVING COALESCE(SUM(s.amount) - COALESCE(SUM(cp.amount), 0), 0) > 0
          ORDER BY outstanding_amount DESC
          LIMIT $1
        `;

        const result = await db.query(query, [limit]);

        const topCreditors = result.rows.map(row => ({
          id: row.id,
          partyName: row.party_name,
          outstandingAmount: parseFloat(row.outstanding_amount),
          creditLimit: row.credit_limit ? parseFloat(row.credit_limit) : null
        }));

        res.json(topCreditors);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    getDailySalesTrend: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        const days = parseInt(req.query.days as string) || 7;

        const query = `
          SELECT
            DATE(s.recorded_at) as date,
            SUM(s.amount) as amount,
            SUM(s.volume) as volume
          FROM ${tenantId}.sales s
          WHERE s.recorded_at >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY DATE(s.recorded_at)
          ORDER BY date ASC
        `;

        const result = await db.query(query);

        const trend = result.rows.map(row => ({
          date: row.date,
          amount: parseFloat(row.amount),
          volume: parseFloat(row.volume)
        }));

        res.json(trend);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}
