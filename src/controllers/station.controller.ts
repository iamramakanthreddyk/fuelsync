import { Request, Response } from 'express';
import { Pool } from 'pg';
import prisma from '../utils/prisma';
import { getStationMetrics, getStationPerformance, getStationComparison, getStationRanking } from '../services/station.service';
import { validateCreateStation, validateUpdateStation } from '../validators/station.validator';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';

export function createStationHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreateStation(req.body);
        const station = await prisma.station.create({
          data: {
            tenant_id: tenantId,
            name: data.name,
            address: data.address || null
          },
          select: { id: true }
        });
        successResponse(res, { id: station.id }, 201);
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      const includeMetrics = req.query.includeMetrics === 'true';
      const stationsData = await prisma.station.findMany({
        where: { tenant_id: tenantId },
        orderBy: { name: 'asc' },
        include: { _count: { select: { pumps: true } } }
      });
      let stations = stationsData.map(st => ({
        id: st.id,
        name: st.name,
        status: st.status,
        address: st.address,
        manager: null,
        attendantCount: 0,
        pumpCount: st._count.pumps,
        createdAt: st.created_at
      }));
      if (includeMetrics) {
        // metrics logic retained via service layer for now
        const metricsPromises = stations.map(st =>
          getStationMetrics(db, tenantId, st.id, 'today').then(m => (st as any).metrics = m)
        );
        await Promise.all(metricsPromises);
      }
      successResponse(res, stations);
    },
    get: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const includeMetrics = req.query.includeMetrics === 'true';
        const station = await prisma.station.findFirst({
          where: { id: req.params.stationId, tenant_id: tenantId },
          include: { _count: { select: { pumps: true } } }
        });
        if (!station) return errorResponse(res, 404, 'Station not found');
        const result: any = {
          id: station.id,
          name: station.name,
          status: station.status,
          address: station.address,
          manager: null,
          attendantCount: 0,
          pumpCount: station._count.pumps,
          createdAt: station.created_at
        };
        if (includeMetrics) {
          result.metrics = await getStationMetrics(db, tenantId, station.id, 'today');
        }
        successResponse(res, result);
      } catch (err: any) {
        return errorResponse(res, 404, err.message);
      }
    },
    update: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateUpdateStation(req.body);
        const updated = await prisma.station.updateMany({
          where: { id: req.params.stationId, tenant_id: tenantId },
          data: { name: data.name || undefined }
        });
        if (!updated.count) return errorResponse(res, 404, 'Station not found');
        const station = await prisma.station.findUnique({
          where: { id: req.params.stationId },
          select: { id: true, name: true, status: true, address: true, created_at: true }
        });
        successResponse(res, station);
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    remove: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const deleted = await prisma.station.deleteMany({
          where: { id: req.params.stationId, tenant_id: tenantId }
        });
        if (!deleted.count) return errorResponse(res, 404, 'Station not found');
        successResponse(res, { status: 'ok' });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },

    metrics: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) return errorResponse(res, 400, 'Missing tenant context');
        const metrics = await getStationMetrics(db, schemaName, req.params.stationId, req.query.period as string || 'today');
        successResponse(res, metrics);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    performance: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) return errorResponse(res, 400, 'Missing tenant context');
        const perf = await getStationPerformance(db, schemaName, req.params.stationId, req.query.range as string || 'monthly');
        successResponse(res, perf);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    compare: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) return errorResponse(res, 400, 'Missing tenant context');
        const stationIds = (req.query.stationIds as string)?.split(',') || [];
        if (stationIds.length === 0) return errorResponse(res, 400, 'Station IDs required');
        const comparison = await getStationComparison(db, schemaName, stationIds, req.query.period as string || 'monthly');
        successResponse(res, comparison);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    ranking: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) return errorResponse(res, 400, 'Missing tenant context');
        const ranking = await getStationRanking(db, schemaName, req.query.metric as string || 'sales', req.query.period as string || 'monthly');
        successResponse(res, ranking);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}
