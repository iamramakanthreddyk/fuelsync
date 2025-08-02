/**
 * @file optimizations/optimized-dashboard.controller.ts
 * @description Optimized dashboard controller with caching, pagination, and improved queries
 */
// Types handled by TypeScript compilation
import { Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { normalizeStationId } from '../utils/normalizeStationId';
import { hasStationAccess } from '../utils/hasStationAccess';

// Redis client for caching
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Cache TTL in seconds
const CACHE_TTL = {
  DASHBOARD_STATS: 300, // 5 minutes
  SALES_SUMMARY: 600,   // 10 minutes
  PAYMENT_BREAKDOWN: 900, // 15 minutes
  FUEL_BREAKDOWN: 900,    // 15 minutes
  TOP_CREDITORS: 1800,    // 30 minutes
};

export function createOptimizedDashboardHandlers(db: Pool) {
  return {
    getSalesSummary: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const tenantId = user?.tenantId;
        const stationId = normalizeStationId(req.query.stationId as string | undefined);
        const range = (req.query.range as string) || 'monthly';

        // Check station access
        if (stationId) {
          const allowed = await hasStationAccess(db, user!, stationId);
          if (!allowed) {
            return errorResponse(res, 403, 'Station access denied');
          }
        }

        // Generate cache key
        const cacheKey = `sales_summary:${tenantId}:${stationId || 'all'}:${range}`;
        
        // Try to get from cache first
        const cached = await redis.get(cacheKey);
        if (cached) {
          return successResponse(res, JSON.parse(cached));
        }

        // Use stored procedure for better performance
        const query = `SELECT * FROM get_sales_summary($1, $2, $3)`;
        const params = [tenantId, stationId, range];
        
        const result = await db.query(query, params);
        const data = result.rows[0] || {
          total_revenue: 0,
          total_volume: 0,
          sales_count: 0,
          period: range
        };

        const response = {
          totalRevenue: parseFloat(data.total_revenue),
          totalVolume: parseFloat(data.total_volume),
          salesCount: parseInt(data.sales_count, 10),
          period: data.period
        };

        // Cache the result
        await redis.setex(cacheKey, CACHE_TTL.SALES_SUMMARY, JSON.stringify(response));

        successResponse(res, response);
      } catch (err: any) {
        console.error('Error in getSalesSummary:', err);
        return errorResponse(res, 500, err.message);
      }
    },

    getPaymentMethodBreakdown: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const tenantId = user?.tenantId;
        const stationId = normalizeStationId(req.query.stationId as string | undefined);
        const dateFrom = req.query.dateFrom as string | undefined;
        const dateTo = req.query.dateTo as string | undefined;

        if (stationId) {
          const allowed = await hasStationAccess(db, user!, stationId);
          if (!allowed) {
            return errorResponse(res, 403, 'Station access denied');
          }
        }

        // Generate cache key
        const cacheKey = `payment_breakdown:${tenantId}:${stationId || 'all'}:${dateFrom || 'none'}:${dateTo || 'none'}`;
        
        // Try cache first
        const cached = await redis.get(cacheKey);
        if (cached) {
          return successResponse(res, JSON.parse(cached));
        }

        // Use materialized view for better performance when possible
        let query: string;
        let params: any[];

        if (!dateFrom && !dateTo) {
          // Use materialized view for recent data
          query = `
            SELECT
              payment_method,
              SUM(total_amount) as amount,
              SUM(transaction_count) as count
            FROM mv_daily_sales_summary
            WHERE tenant_id = $1
              AND sale_date >= CURRENT_DATE - INTERVAL '30 days'
              ${stationId ? 'AND station_id = $2' : ''}
            GROUP BY payment_method
            ORDER BY amount DESC
          `;
          params = stationId ? [tenantId, stationId] : [tenantId];
        } else {
          // Fall back to direct query for custom date ranges
          const conditions: string[] = ['s.tenant_id = $1'];
          params = [tenantId];
          let paramIndex = 2;

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

          query = `
            SELECT
              s.payment_method,
              SUM(s.amount) as amount,
              COUNT(*) as count
            FROM sales s
            WHERE ${conditions.join(' AND ')}
            GROUP BY s.payment_method
            ORDER BY amount DESC
          `;
        }

        const result = await db.query(query, params);
        
        if (result.rows.length === 0) {
          const emptyResponse: any[] = [];
          await redis.setex(cacheKey, CACHE_TTL.PAYMENT_BREAKDOWN, JSON.stringify(emptyResponse));
          return successResponse(res, emptyResponse);
        }

        const totalAmount = result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
        const breakdown = result.rows.map(row => ({
          paymentMethod: row.payment_method,
          amount: parseFloat(row.amount),
          count: parseInt(row.count, 10),
          percentage: totalAmount > 0 ? (parseFloat(row.amount) / totalAmount) * 100 : 0
        }));

        // Cache the result
        await redis.setex(cacheKey, CACHE_TTL.PAYMENT_BREAKDOWN, JSON.stringify(breakdown));

        successResponse(res, breakdown);
      } catch (err: any) {
        console.error('Error in getPaymentMethodBreakdown:', err);
        return errorResponse(res, 500, err.message);
      }
    },

    getFuelTypeBreakdown: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const tenantId = user?.tenantId;
        const stationId = normalizeStationId(req.query.stationId as string | undefined);
        const period = (req.query.period as string) || 'monthly';

        if (stationId) {
          const allowed = await hasStationAccess(db, user!, stationId);
          if (!allowed) {
            return errorResponse(res, 403, 'Station access denied');
          }
        }

        // Generate cache key
        const cacheKey = `fuel_breakdown:${tenantId}:${stationId || 'all'}:${period}`;
        
        // Try cache first
        const cached = await redis.get(cacheKey);
        if (cached) {
          return successResponse(res, JSON.parse(cached));
        }

        // Use materialized view for better performance
        let dateFilter: string;
        switch (period) {
          case 'daily':
            dateFilter = "AND sale_date = CURRENT_DATE";
            break;
          case 'weekly':
            dateFilter = "AND sale_date >= CURRENT_DATE - INTERVAL '7 days'";
            break;
          case 'monthly':
            dateFilter = "AND sale_date >= CURRENT_DATE - INTERVAL '30 days'";
            break;
          case 'yearly':
            dateFilter = "AND sale_date >= CURRENT_DATE - INTERVAL '1 year'";
            break;
          default:
            dateFilter = "AND sale_date >= CURRENT_DATE - INTERVAL '30 days'";
        }

        const query = `
          SELECT
            fuel_type,
            SUM(total_volume) as volume,
            SUM(total_amount) as amount
          FROM mv_daily_sales_summary
          WHERE tenant_id = $1 ${dateFilter}
            ${stationId ? 'AND station_id = $2' : ''}
          GROUP BY fuel_type
          ORDER BY amount DESC
        `;

        const params = stationId ? [tenantId, stationId] : [tenantId];
        const result = await db.query(query, params);
        
        if (result.rows.length === 0) {
          const emptyResponse: any[] = [];
          await redis.setex(cacheKey, CACHE_TTL.FUEL_BREAKDOWN, JSON.stringify(emptyResponse));
          return successResponse(res, emptyResponse);
        }

        const breakdown = result.rows.map(row => ({
          fuelType: row.fuel_type,
          volume: parseFloat(row.volume),
          amount: parseFloat(row.amount)
        }));

        // Cache the result
        await redis.setex(cacheKey, CACHE_TTL.FUEL_BREAKDOWN, JSON.stringify(breakdown));

        successResponse(res, breakdown);
      } catch (err: any) {
        console.error('Error in getFuelTypeBreakdown:', err);
        return errorResponse(res, 500, err.message);
      }
    },

    getTopCreditors: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const tenantId = user?.tenantId;
        const stationId = normalizeStationId(req.query.stationId as string | undefined);
        const limit = Math.min(parseInt(req.query.limit as string) || 5, 50); // Cap at 50

        if (stationId) {
          const allowed = await hasStationAccess(db, user!, stationId);
          if (!allowed) {
            return errorResponse(res, 403, 'Station access denied');
          }
        }

        // Generate cache key
        const cacheKey = `top_creditors:${tenantId}:${stationId || 'all'}:${limit}`;
        
        // Try cache first
        const cached = await redis.get(cacheKey);
        if (cached) {
          return successResponse(res, JSON.parse(cached));
        }

        // Optimized query with proper indexing
        const query = `
          SELECT
            c.id,
            c.name,
            c.phone,
            COALESCE(SUM(s.amount), 0) as total_credit,
            COUNT(s.id) as transaction_count,
            MAX(s.recorded_at) as last_transaction
          FROM creditors c
          LEFT JOIN sales s ON c.id = s.creditor_id 
            AND s.tenant_id = $1
            AND s.recorded_at >= CURRENT_DATE - INTERVAL '30 days'
            ${stationId ? 'AND s.station_id = $2' : ''}
          WHERE c.tenant_id = $1
          GROUP BY c.id, c.name, c.phone
          HAVING COALESCE(SUM(s.amount), 0) > 0
          ORDER BY total_credit DESC
          LIMIT $${stationId ? 3 : 2}
        `;

        const params = stationId ? [tenantId, stationId, limit] : [tenantId, limit];
        const result = await db.query(query, params);

        const creditors = result.rows.map(row => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          totalCredit: parseFloat(row.total_credit),
          transactionCount: parseInt(row.transaction_count, 10),
          lastTransaction: row.last_transaction
        }));

        // Cache the result
        await redis.setex(cacheKey, CACHE_TTL.TOP_CREDITORS, JSON.stringify(creditors));

        successResponse(res, creditors);
      } catch (err: any) {
        console.error('Error in getTopCreditors:', err);
        return errorResponse(res, 500, err.message);
      }
    },

    getDashboardStats: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const tenantId = user?.tenantId;
        const stationId = normalizeStationId(req.query.stationId as string | undefined);

        if (stationId) {
          const allowed = await hasStationAccess(db, user!, stationId);
          if (!allowed) {
            return errorResponse(res, 403, 'Station access denied');
          }
        }

        // Generate cache key
        const cacheKey = `dashboard_stats:${tenantId}:${stationId || 'all'}`;
        
        // Try cache first
        const cached = await redis.get(cacheKey);
        if (cached) {
          return successResponse(res, JSON.parse(cached));
        }

        // Use materialized view for station metrics
        const stationMetricsQuery = stationId 
          ? `SELECT * FROM mv_station_metrics WHERE tenant_id = $1 AND station_id = $2`
          : `SELECT 
               tenant_id,
               SUM(today_sales) as today_sales,
               SUM(today_transactions) as today_transactions,
               SUM(total_pumps) as total_pumps,
               SUM(active_pumps) as active_pumps,
               COUNT(*) as total_stations
             FROM mv_station_metrics 
             WHERE tenant_id = $1
             GROUP BY tenant_id`;

        const stationParams = stationId ? [tenantId, stationId] : [tenantId];
        const stationResult = await db.query(stationMetricsQuery, stationParams);

        if (stationResult.rows.length === 0) {
          return errorResponse(res, 404, 'No data found');
        }

        const stationData = stationResult.rows[0];

        // Get sales growth (compare with previous period)
        const growthQuery = `
          SELECT 
            COALESCE(SUM(CASE WHEN sale_date >= CURRENT_DATE - INTERVAL '30 days' THEN total_amount END), 0) as current_period,
            COALESCE(SUM(CASE WHEN sale_date >= CURRENT_DATE - INTERVAL '60 days' 
                                AND sale_date < CURRENT_DATE - INTERVAL '30 days' THEN total_amount END), 0) as previous_period
          FROM mv_daily_sales_summary
          WHERE tenant_id = $1
            ${stationId ? 'AND station_id = $2' : ''}
        `;

        const growthResult = await db.query(growthQuery, stationParams);
        const growthData = growthResult.rows[0];
        
        const currentPeriod = parseFloat(growthData.current_period);
        const previousPeriod = parseFloat(growthData.previous_period);
        const salesGrowth = previousPeriod > 0 
          ? ((currentPeriod - previousPeriod) / previousPeriod) * 100 
          : 0;

        const stats = {
          totalSales: currentPeriod,
          todaySales: parseFloat(stationData.today_sales || 0),
          todayTransactions: parseInt(stationData.today_transactions || 0, 10),
          activePumps: parseInt(stationData.active_pumps || 0, 10),
          totalPumps: parseInt(stationData.total_pumps || 0, 10),
          totalStations: stationId ? 1 : parseInt(stationData.total_stations || 0, 10),
          salesGrowth: salesGrowth,
          efficiency: stationData.active_pumps > 0 
            ? (parseInt(stationData.active_pumps, 10) / parseInt(stationData.total_pumps, 10)) * 100 
            : 0
        };

        // Cache the result
        await redis.setex(cacheKey, CACHE_TTL.DASHBOARD_STATS, JSON.stringify(stats));

        successResponse(res, stats);
      } catch (err: any) {
        console.error('Error in getDashboardStats:', err);
        return errorResponse(res, 500, err.message);
      }
    },

    // Cache invalidation helper
    invalidateCache: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const tenantId = user?.tenantId;
        const pattern = req.query.pattern as string || `*${tenantId}*`;

        // Get all keys matching the pattern
        const keys = await redis.keys(pattern);
        
        if (keys.length > 0) {
          await redis.del(...keys);
        }

        successResponse(res, { 
          message: 'Cache invalidated successfully',
          keysDeleted: keys.length 
        });
      } catch (err: any) {
        console.error('Error in invalidateCache:', err);
        return errorResponse(res, 500, err.message);
      }
    },

    // Health check endpoint
    healthCheck: async (req: Request, res: Response) => {
      try {
        // Check database connection
        const dbResult = await db.query('SELECT 1');
        
        // Check Redis connection
        const redisResult = await redis.ping();
        
        // Check materialized views freshness
        const viewFreshnessQuery = `
          SELECT 
            schemaname,
            matviewname,
            hasindexes,
            ispopulated
          FROM pg_matviews 
          WHERE schemaname = 'public'
        `;
        const viewResult = await db.query(viewFreshnessQuery);

        successResponse(res, {
          status: 'healthy',
          database: dbResult.rows.length > 0 ? 'connected' : 'disconnected',
          redis: redisResult === 'PONG' ? 'connected' : 'disconnected',
          materializedViews: viewResult.rows,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        console.error('Error in healthCheck:', err);
        return errorResponse(res, 500, err.message);
      }
    }
  };
}
