import { PoolClient } from 'pg';
import { getPlanRules } from '../config/planConfig';

// Helper to fetch tenant plan id
async function fetchPlanId(db: PoolClient, tenantId: string): Promise<string> {
  const res = await db.query('SELECT plan_id FROM public.tenants WHERE id = $1', [tenantId]);
  return res.rows[0]?.plan_id;
}

// NOTE: The following middleware stubs show the intended logic. Actual routing
// integration will be implemented in Phase 2.

export async function beforeCreateStation(db: PoolClient, tenantId: string) {
  const planId = await fetchPlanId(db, tenantId);
  const rules = getPlanRules(planId);

  // Pseudo count query
  const countRes = await db.query(`SELECT COUNT(*) FROM ${tenantId}.stations`);
  if (Number(countRes.rows[0].count) >= rules.maxStations) {
    throw new Error('Plan limit exceeded: stations');
  }
}

export async function beforeCreatePump(db: PoolClient, tenantId: string, stationId: string) {
  const planId = await fetchPlanId(db, tenantId);
  const rules = getPlanRules(planId);

  // Pseudo count query per station
  const countRes = await db.query(`SELECT COUNT(*) FROM ${tenantId}.pumps WHERE station_id = $1`, [stationId]);
  if (Number(countRes.rows[0].count) >= rules.maxPumpsPerStation) {
    throw new Error('Plan limit exceeded: pumps per station');
  }
}

export async function beforeCreateNozzle(db: PoolClient, tenantId: string, pumpId: string) {
  const planId = await fetchPlanId(db, tenantId);
  const rules = getPlanRules(planId);

  const countRes = await db.query(`SELECT COUNT(*) FROM ${tenantId}.nozzles WHERE pump_id = $1`, [pumpId]);
  if (Number(countRes.rows[0].count) >= rules.maxNozzlesPerPump) {
    throw new Error('Plan limit exceeded: nozzles per pump');
  }
}

export async function beforeCreateUser(db: PoolClient, tenantId: string) {
  const planId = await fetchPlanId(db, tenantId);
  const rules = getPlanRules(planId);

  const countRes = await db.query(`SELECT COUNT(*) FROM ${tenantId}.users`);
  if (Number(countRes.rows[0].count) >= rules.maxEmployees) {
    throw new Error('Plan limit exceeded: users');
  }
}
