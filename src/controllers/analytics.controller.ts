import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { normalizeStationId } from '../utils/normalizeStationId';
import { getStationComparison, getStationRanking } from '../services/station.service';
// Frontend analytics endpoints handler
import {
  getHourlySales,
  getPeakHours,
  getFuelPerformance,
  getTenantDashboardMetrics,
  getSuperAdminAnalytics,
} from '../services/analytics.service';

export function createAnalyticsHandlers() {
  return {
    stationRanking: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const period = (req.query.period as string) || 'month';
        const data = await getStationRanking(null, tenantId, 'sales', period);
        successResponse(res, data);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    getDashboardMetrics: async (_req: Request, res: Response) => {
      try {
        const data = await getSuperAdminAnalytics();
        successResponse(res, data);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    tenantDashboard: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const data = await getTenantDashboardMetrics(tenantId);
        successResponse(res, data);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    getTenantAnalytics: async (req: Request, res: Response) => {
      try {
        const tenantId = req.params.id;

        const tenant = await prisma.tenant.findFirst({
          where: { id: tenantId },
          include: { plan: { select: { name: true } } },
        });
        if (!tenant) {
          return errorResponse(res, 404, 'Tenant not found');
        }

        const userCount = await prisma.user.count({ where: { tenant_id: tenantId } });
        const stationCount = await prisma.station.count({ where: { tenant_id: tenantId } });
        const pumpCount = await prisma.pump.count({ where: { tenant_id: tenantId } });
        const salesAggregate = await prisma.sale.aggregate({
          where: { tenant_id: tenantId },
          _sum: { amount: true },
          _count: { _all: true },
        });
        const salesCount = salesAggregate._count._all;
        const totalSales = Number(salesAggregate._sum.amount || 0);

        // Format tenant date for frontend
        const formattedTenant = {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          plan_name: tenant.plan?.name,
          created_at: tenant.created_at.toISOString(),
        };
        
        successResponse(res, {
          tenant: formattedTenant,
          userCount,
          stationCount,
          pumpCount,
          salesCount,
          totalSales,
          // Add summary for frontend
          summary: {
            users: userCount,
            stations: stationCount,
            pumps: pumpCount,
            sales: salesCount
          }
        });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    stationComparison: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const idsParam = req.query.stationIds as string;
        if (!idsParam) return errorResponse(res, 400, 'stationIds required');
        const stationIds = idsParam.split(',');
        const period = (req.query.period as string) || 'monthly';
        const data = await getStationComparison(tenantId, stationIds, period);
        successResponse(res, data);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    hourlySales: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const { stationId, dateFrom, dateTo } = req.query as any;
        if (!stationId || !dateFrom || !dateTo) {
          return errorResponse(res, 400, 'stationId, dateFrom and dateTo required');
        }
        const data = await getHourlySales(
          tenantId,
          stationId,
          new Date(dateFrom),
          new Date(dateTo)
        );
        successResponse(res, data);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    peakHours: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const stationId = normalizeStationId(req.query.stationId as string | undefined);
        if (!stationId) return errorResponse(res, 400, 'stationId required');
        const data = await getPeakHours(tenantId, stationId);
        successResponse(res, data);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    fuelPerformance: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const { stationId: stationIdRaw, dateFrom, dateTo } = req.query as any;
        const stationId = normalizeStationId(stationIdRaw);
        if (!stationId || !dateFrom || !dateTo) {
          return errorResponse(res, 400, 'stationId, dateFrom and dateTo required');
        }
        const data = await getFuelPerformance(
          tenantId,
          stationId,
          new Date(dateFrom),
          new Date(dateTo)
        );
        successResponse(res, data);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}