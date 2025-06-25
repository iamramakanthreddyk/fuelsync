import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createStation, listStations, updateStation, deleteStation, getStationMetrics, getStationPerformance, getStationComparison, getStationRanking } from '../services/station.service';
import { validateCreateStation, validateUpdateStation } from '../validators/station.validator';
import { errorResponse } from '../utils/errorResponse';

export function createStationHandlers(db: Pool) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        // Get tenant ID from JWT token or header
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] as string;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateCreateStation(req.body);
        const id = await createStation(db, tenantId, data.name, data.address);
        res.status(201).json({ id });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    list: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      const includeMetrics = req.query.includeMetrics === 'true';
      const stations = await listStations(db, tenantId, includeMetrics);
      res.json(stations);
    },
    update: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] as string;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        const data = validateUpdateStation(req.body);
        await updateStation(db, tenantId, req.params.id, data.name);
        res.json({ status: 'ok' });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },
    remove: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] as string;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        await deleteStation(db, tenantId, req.params.id);
        res.json({ status: 'ok' });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },

    metrics: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] as string;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const metrics = await getStationMetrics(db, tenantId, req.params.id, req.query.period as string || 'today');
        res.json(metrics);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    performance: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] as string;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const perf = await getStationPerformance(db, tenantId, req.params.id, req.query.range as string || 'monthly');
        res.json(perf);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    compare: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] as string;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const stationIds = (req.query.stationIds as string)?.split(',') || [];
        if (stationIds.length === 0) return errorResponse(res, 400, 'Station IDs required');
        const comparison = await getStationComparison(db, tenantId, stationIds, req.query.period as string || 'monthly');
        res.json(comparison);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },

    ranking: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] as string;
        if (!tenantId) return errorResponse(res, 400, 'Missing tenant context');
        const ranking = await getStationRanking(db, tenantId, req.query.metric as string || 'sales', req.query.period as string || 'monthly');
        res.json(ranking);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}
