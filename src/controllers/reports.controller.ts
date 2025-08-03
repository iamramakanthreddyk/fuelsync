import { Request, Response } from 'express';
import { Pool } from 'pg';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { normalizeStationId } from '../utils/normalizeStationId';
import { getPlanRules } from '../config/planConfig';
import {
  getReportTier,
  isReportTypeAllowed,
  isFormatAllowed,
  getMaxRecords,
  checkDailyReportLimit,
  logReportGeneration
} from '../config/reportTiers';
import { parseRows } from '../utils/parseDb';

// Enhanced plan-based report access control with tiers
async function checkReportAccess(
  db: Pool,
  tenantId: string,
  reportType: string,
  format: string = 'csv'
): Promise<{ allowed: boolean; message?: string; tier?: any }> {
  try {
    const tenantResult = await db.query('SELECT plan_id FROM public.tenants WHERE id = $1', [tenantId]);
    if (tenantResult.rows.length === 0) {
      return { allowed: false, message: 'Tenant not found' };
    }

    const planId = tenantResult.rows[0].plan_id;
    const tier = getReportTier(planId);

    // Check if reports are enabled for this plan
    if (tier.maxRecordsPerReport === 0) {
      return {
        allowed: false,
        message: 'Reports not available in your current plan. Please upgrade to Pro or Enterprise.',
        tier
      };
    }

    // Check report type access
    if (!isReportTypeAllowed(planId, reportType)) {
      return {
        allowed: false,
        message: `Report type '${reportType}' not available in ${tier.name} plan. Please upgrade for advanced reports.`,
        tier
      };
    }

    // Check format access
    if (!isFormatAllowed(planId, format)) {
      return {
        allowed: false,
        message: `Format '${format}' not available in ${tier.name} plan. Available formats: ${tier.allowedFormats.join(', ')}`,
        tier
      };
    }

    // Check daily limits
    const dailyLimit = await checkDailyReportLimit(db, tenantId, planId);
    if (!dailyLimit.allowed) {
      return {
        allowed: false,
        message: `Daily report limit reached (${tier.maxReportsPerDay}). Please try again tomorrow or upgrade your plan.`,
        tier
      };
    }

    return { allowed: true, tier };
  } catch (error) {
    console.error('[REPORTS] Error checking plan access:', error);
    return { allowed: false, message: 'Error checking plan access' };
  }
}

export function createReportsHandlers(db: Pool) {
  async function runExportSales(req: Request, res: Response) {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');

        const stationId = normalizeStationId(req.query.stationId as string | undefined);
        const dateFrom = req.query.dateFrom as string | undefined;
        const dateTo = req.query.dateTo as string | undefined;
        const format = req.query.format as string || 'json';

        // Check plan-based access with enhanced tiers
        const accessCheck = await checkReportAccess(db, tenantId, 'sales-basic', format);
        if (!accessCheck.allowed) {
          return errorResponse(res, 403, accessCheck.message || 'Access denied');
        }

        const tier = accessCheck.tier;
        console.log(`[REPORTS] Sales report access granted for ${tier.name} plan`);

        // Apply plan-based limits
        const requestedLimit = parseInt(req.query.limit as string) || 1000;
        const planId = (await db.query('SELECT plan_id FROM public.tenants WHERE id = $1', [tenantId])).rows[0]?.plan_id;
        const limit = getMaxRecords(planId, requestedLimit);
        const offset = parseInt(req.query.offset as string) || 0;
        const preview = req.query.preview === 'true';

        if (preview) {
          // For preview, limit to 10 records
          req.query.limit = '10';
        }

        console.log(`[REPORTS] Plan-based limit applied: ${limit} records (requested: ${requestedLimit})`);

        const conditions = [];
        const params = [];
        let paramIndex = 1;
        
        if (stationId) {
          conditions.push(`s.station_id = $${paramIndex++}`);
          params.push(stationId);
        }
        if (dateFrom) {
          conditions.push(`s.recorded_at >= $${paramIndex++}`);
          params.push(dateFrom);
        }
        if (dateTo) {
          conditions.push(`s.recorded_at <= $${paramIndex++}`);
          params.push(dateTo);
        }
        
        conditions.push(`s.tenant_id = $${paramIndex++}`);
        params.push(tenantId);
        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        
        const query = `
          SELECT 
            s.id,
            st.name as station_name,
            s.fuel_type,
            s.volume,
            s.fuel_price,
            s.cost_price,
            s.amount,
            s.profit,
            s.payment_method,
            c.party_name as creditor_name,
            s.recorded_at
          FROM public.sales s
          JOIN public.stations st ON s.station_id = st.id
          LEFT JOIN public.creditors c ON s.creditor_id = c.id
          ${whereClause}
          ORDER BY s.recorded_at DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        params.push(limit, offset);
        console.log(`[REPORTS] Sales query - Limit: ${limit}, Offset: ${offset}, Preview: ${preview}`);
        const startTime = Date.now();
        const result = await db.query(query, params);
        const generationTime = Date.now() - startTime;

        // Log report generation for tracking (async, don't wait)
        if (!preview) {
          logReportGeneration(db, tenantId, 'sales-basic', result.rows.length, format)
            .catch(err => console.error('[REPORTS] Error logging generation:', err));
        }

        if (format === 'csv') {
          const csv = convertToCSV(result.rows);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
          res.setHeader('X-Report-Records', result.rows.length.toString());
          res.setHeader('X-Report-Generation-Time', generationTime.toString());
          res.send(csv);
        } else {
          const data = parseRows(result.rows);
          successResponse(res, {
            data,
            summary: {
              totalRecords: data.length,
              totalSales: data.reduce((sum, row) => sum + row.amount, 0),
              totalProfit: data.reduce((sum, row) => sum + row.profit, 0),
              generationTimeMs: generationTime,
              planTier: tier.name,
              remainingDailyReports: (await checkDailyReportLimit(db, tenantId, planId)).remaining
            }
          });
        }
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
    }
  }

  async function runExportFinancial(req: Request, res: Response) {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');

        // Check plan-based access
        const hasAccess = await checkReportAccess(db, tenantId, 'financial');
        if (!hasAccess) {
          return errorResponse(res, 403, 'Financial reports not available in your current plan. Please upgrade to access reports.');
        }

        const stationId = normalizeStationId(req.query.stationId as string | undefined);
        const period = req.query.period as string || 'monthly';

        let dateFilter = '';
        switch (period) {
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

        const stationFilter = stationId ? 'AND s.station_id = $1' : '';
        const params = stationId ? [stationId] : [];

        const query = `
          SELECT
            st.name as station_name,
            s.fuel_type,
            SUM(s.volume) as total_volume,
            SUM(s.amount) as total_revenue,
            SUM(s.profit) as total_profit,
            AVG(s.fuel_price) as avg_price,
            COUNT(*) as transaction_count,
            CASE WHEN SUM(s.amount) > 0 THEN (SUM(s.profit) / SUM(s.amount)) * 100 ELSE 0 END as profit_margin
          FROM public.sales s
          JOIN public.stations st ON s.station_id = st.id
          WHERE s.tenant_id = $${stationId ? 2 : 1} ${dateFilter} ${stationFilter}
          GROUP BY st.name, s.fuel_type
          ORDER BY st.name, total_revenue DESC
        `;

        params.push(tenantId);
        const result = await db.query(query, params);

        successResponse(res, {
          period,
          data: result.rows.map(row => ({
            stationName: row.station_name,
            fuelType: row.fuel_type,
            totalVolume: parseFloat(row.total_volume),
            totalRevenue: parseFloat(row.total_revenue),
            totalProfit: parseFloat(row.total_profit),
            avgPrice: parseFloat(row.avg_price),
            transactionCount: parseInt(row.transaction_count),
            profitMargin: parseFloat(row.profit_margin)
          }))
        });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
  }

  return {
    // Basic reports list endpoint
    getReportsList: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');

        // Return available report types based on plan
        const accessCheck = await checkReportAccess(db, tenantId, 'sales-basic', 'json');
        const availableReports = [];

        if (accessCheck.allowed) {
          availableReports.push({
            id: 'sales',
            name: 'Sales Report',
            type: 'sales',
            description: 'Daily sales summary with volume and revenue data',
            formats: ['csv', 'json'],
            status: 'available'
          });
        }

        // Check financial reports access (Enterprise only)
        const financialAccess = await checkReportAccess(db, tenantId, 'financial', 'json');
        if (financialAccess.allowed) {
          availableReports.push({
            id: 'financial',
            name: 'Financial Report',
            type: 'financial',
            description: 'Comprehensive financial analysis and profit margins',
            formats: ['csv', 'json'],
            status: 'available'
          });
        }

        successResponse(res, availableReports);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    exportSales: runExportSales,
    exportSalesPost: async (req: Request, res: Response) => {
      req.query = { ...req.body } as any;
      await runExportSales(req, res);
    },

    getSales: async (req: Request, res: Response) => {
      await runExportSales(req, res);
    },

    exportGeneric: async (req: Request, res: Response) => {
      try {
        const { type, format, stationId, dateRange } = req.body || {};
        if (!type) return errorResponse(res, 400, 'type required');

        if (type === 'sales') {
          req.query = {
            stationId,
            dateFrom: dateRange?.from,
            dateTo: dateRange?.to,
            format,
          } as any;
          await runExportSales(req, res);
        } else if (type === 'financial') {
          req.query = { stationId, period: 'monthly' } as any;
          await runExportFinancial(req, res);
        } else {
          return errorResponse(res, 400, 'Unsupported report type');
        }
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    scheduleReport: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const { type, stationId, frequency } = req.body || {};
        if (!type || !frequency) {
          return errorResponse(res, 400, 'type and frequency required');
        }
        const result = await db.query(
          `INSERT INTO public.report_schedules (tenant_id, station_id, type, frequency) VALUES ($1,$2,$3,$4) RETURNING id`,
          [tenantId, stationId || null, type, frequency]
        );
        successResponse(res, { id: result.rows[0].id }, undefined, 201);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    exportFinancial: runExportFinancial
  };
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}