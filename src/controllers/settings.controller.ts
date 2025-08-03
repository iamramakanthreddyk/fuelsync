import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getTenantSettings, upsertTenantSettings } from '../services/settings.service';
import { getAllSettings, updateSetting } from '../services/settingsService';
import { validateUpdateSettings } from '../validators/settings.validator';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';

export function createSettingsHandlers(db: Pool) {
  return {
    get: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      const base = await getTenantSettings(db, tenantId);
      const list = await getAllSettings(db, tenantId);
      const flags: Record<string, string> = {};
      for (const row of list) {
        flags[row.key] = row.value;
      }
      successResponse(res, { settings: base, flags });
    },
    update: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        if (req.body && req.body.key) {
          const { key, value } = req.body;
          if (typeof key !== 'string' || typeof value !== 'string') {
            return errorResponse(res, 400, 'key and value required');
          }
          await updateSetting(db, tenantId, key, value);
        } else {
          const input = validateUpdateSettings(req.body);
          await upsertTenantSettings(db, tenantId, input);
        }
        successResponse(res, { status: 'ok' });
      } catch (err: any) {
        return errorResponse(res, 400, err.message);
      }
    },

    // Get tenant plan information with feature comparison
    getPlanInfo: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        // Get current tenant plan
        const tenantQuery = `
          SELECT
            t.id,
            t.name as tenant_name,
            t.status,
            p.id as plan_id,
            p.name as plan_name,
            p.max_stations,
            p.max_pumps_per_station,
            p.max_nozzles_per_pump,
            p.price_monthly,
            p.price_yearly,
            p.features
          FROM public.tenants t
          LEFT JOIN public.plans p ON t.plan_id = p.id
          WHERE t.id = $1
        `;

        const tenantResult = await db.query(tenantQuery, [tenantId]);
        if (tenantResult.rows.length === 0) {
          return errorResponse(res, 404, 'Tenant not found');
        }

        const tenant = tenantResult.rows[0];

        // Get current usage
        const usageQuery = `
          SELECT
            (SELECT COUNT(*) FROM public.stations WHERE tenant_id = $1) as current_stations,
            (SELECT COUNT(*) FROM public.pumps WHERE tenant_id = $1) as current_pumps,
            (SELECT COUNT(*) FROM public.nozzles WHERE tenant_id = $1) as current_nozzles,
            (SELECT COUNT(*) FROM public.users WHERE tenant_id = $1) as current_users
        `;

        const usageResult = await db.query(usageQuery, [tenantId]);
        const usage = usageResult.rows[0];

        // Get all available plans for comparison
        const allPlansQuery = `
          SELECT
            id,
            name,
            max_stations,
            max_pumps_per_station,
            max_nozzles_per_pump,
            price_monthly,
            price_yearly,
            features
          FROM public.plans
          ORDER BY price_monthly ASC
        `;

        const allPlansResult = await db.query(allPlansQuery);
        const availablePlans = allPlansResult.rows.map(plan => ({
          id: plan.id,
          name: plan.name,
          maxStations: plan.max_stations,
          maxPumpsPerStation: plan.max_pumps_per_station,
          maxNozzlesPerPump: plan.max_nozzles_per_pump,
          priceMonthly: Math.round(parseFloat(plan.price_monthly) * 100) / 100,
          priceYearly: Math.round(parseFloat(plan.price_yearly) * 100) / 100,
          features: plan.features,
          isCurrent: plan.id === tenant.plan_id,
          canUpgrade: parseFloat(plan.price_monthly) > parseFloat(tenant.price_monthly || '0')
        }));

        // Calculate plan utilization
        const utilization = {
          stations: {
            current: parseInt(usage.current_stations),
            limit: tenant.max_stations,
            percentage: tenant.max_stations > 0 ? Math.round((parseInt(usage.current_stations) / tenant.max_stations) * 100) : 0
          },
          pumps: {
            current: parseInt(usage.current_pumps),
            estimated_limit: tenant.max_stations * tenant.max_pumps_per_station,
            percentage: tenant.max_stations > 0 ? Math.round((parseInt(usage.current_pumps) / (tenant.max_stations * tenant.max_pumps_per_station)) * 100) : 0
          },
          nozzles: {
            current: parseInt(usage.current_nozzles),
            estimated_limit: tenant.max_stations * tenant.max_pumps_per_station * tenant.max_nozzles_per_pump,
            percentage: tenant.max_stations > 0 ? Math.round((parseInt(usage.current_nozzles) / (tenant.max_stations * tenant.max_pumps_per_station * tenant.max_nozzles_per_pump)) * 100) : 0
          },
          users: {
            current: parseInt(usage.current_users),
            limit: 'Unlimited', // Most plans have unlimited users
            percentage: 0
          }
        };

        // Determine upgrade recommendations
        const needsUpgrade =
          utilization.stations.percentage > 80 ||
          utilization.pumps.percentage > 80 ||
          utilization.nozzles.percentage > 80;

        const upgradeRecommendation = needsUpgrade ?
          availablePlans.find(plan => plan.canUpgrade && !plan.isCurrent) : null;

        successResponse(res, {
          currentPlan: {
            id: tenant.plan_id,
            name: tenant.plan_name,
            maxStations: tenant.max_stations,
            maxPumpsPerStation: tenant.max_pumps_per_station,
            maxNozzlesPerPump: tenant.max_nozzles_per_pump,
            priceMonthly: Math.round(parseFloat(tenant.price_monthly || '0') * 100) / 100,
            priceYearly: Math.round(parseFloat(tenant.price_yearly || '0') * 100) / 100,
            features: tenant.features || []
          },
          currentUsage: usage,
          utilization,
          availablePlans,
          upgradeRecommendation,
          needsUpgrade,
          tenant: {
            id: tenant.id,
            name: tenant.tenant_name,
            status: tenant.status
          }
        });

      } catch (err: any) {
        console.error('[SETTINGS-CONTROLLER] Error getting plan info:', err);
        return errorResponse(res, 500, 'Failed to get plan information');
      }
    }
  };
}
