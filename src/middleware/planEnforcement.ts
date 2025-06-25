import { PoolClient } from 'pg';
import { getPlanRules } from '../config/planConfig';

// Helper to fetch tenant plan id using schema name
async function fetchPlanId(db: PoolClient, schemaName: string): Promise<string> {
  const res = await db.query(
    'SELECT plan_id FROM public.tenants WHERE schema_name = $1',
    [schemaName]
  );
  return res.rows[0]?.plan_id;
}

// NOTE: The following middleware stubs show the intended logic. Actual routing
// integration will be implemented in Phase 2.

export async function beforeCreateStation(db: PoolClient, schemaName: string) {
  const planId = await fetchPlanId(db, schemaName);
  const rules = getPlanRules(planId);

  // Pseudo count query
  const countRes = await db.query(`SELECT COUNT(*) FROM ${schemaName}.stations`);
  if (Number(countRes.rows[0].count) >= rules.maxStations) {
    throw new Error('Plan limit exceeded: stations');
  }
}

export async function beforeCreatePump(
  db: PoolClient,
  schemaName: string,
  stationId: string
) {
  const planId = await fetchPlanId(db, schemaName);
  const rules = getPlanRules(planId);

  // Pseudo count query per station
  const countRes = await db.query(
    `SELECT COUNT(*) FROM ${schemaName}.pumps WHERE station_id = $1`,
    [stationId]
  );
  if (Number(countRes.rows[0].count) >= rules.maxPumpsPerStation) {
    throw new Error('Plan limit exceeded: pumps per station');
  }
}

export async function beforeCreateNozzle(
  db: PoolClient,
  schemaName: string,
  pumpId: string
) {
  const planId = await fetchPlanId(db, schemaName);
  const rules = getPlanRules(planId);

  const countRes = await db.query(
    `SELECT COUNT(*) FROM ${schemaName}.nozzles WHERE pump_id = $1`,
    [pumpId]
  );
  if (Number(countRes.rows[0].count) >= rules.maxNozzlesPerPump) {
    throw new Error('Plan limit exceeded: nozzles per pump');
  }
}

export async function beforeCreateUser(db: PoolClient, schemaName: string) {
  const planId = await fetchPlanId(db, schemaName);
  const rules = getPlanRules(planId);

  const countRes = await db.query(`SELECT COUNT(*) FROM ${schemaName}.users`);
  if (Number(countRes.rows[0].count) >= rules.maxEmployees) {
    throw new Error('Plan limit exceeded: users');
  }
}
