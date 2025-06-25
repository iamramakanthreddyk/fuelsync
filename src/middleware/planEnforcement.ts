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

  // Get schema name from tenant UUID
  const schemaRes = await db.query('SELECT schema_name FROM public.tenants WHERE id = $1', [tenantId]);
  const schemaName = schemaRes.rows[0]?.schema_name;
  
  if (!schemaName) {
    throw new Error(`Schema not found for tenant: ${tenantId}`);
  }

  const countRes = await db.query(`SELECT COUNT(*) FROM ${schemaName}.stations`);
  if (Number(countRes.rows[0].count) >= rules.maxStations) {
    throw new Error('Plan limit exceeded: stations');
  }
}

export async function beforeCreatePump(db: PoolClient, schemaName: string, stationId: string) {
  // Get tenant UUID from schema name
  const tenantRes = await db.query('SELECT id FROM public.tenants WHERE schema_name = $1', [schemaName]);
  const tenantId = tenantRes.rows[0]?.id;
  
  if (!tenantId) {
    throw new Error(`Tenant not found for schema: ${schemaName}`);
  }
  
  const planId = await fetchPlanId(db, tenantId);
  const rules = getPlanRules(planId);

  const countRes = await db.query(`SELECT COUNT(*) FROM ${schemaName}.pumps WHERE station_id = $1`, [stationId]);
  if (Number(countRes.rows[0].count) >= rules.maxPumpsPerStation) {
    throw new Error('Plan limit exceeded: pumps per station');
  }
}

export async function beforeCreateNozzle(db: PoolClient, schemaName: string, pumpId: string) {
  // Get tenant UUID from schema name
  const tenantRes = await db.query('SELECT id FROM public.tenants WHERE schema_name = $1', [schemaName]);
  const tenantId = tenantRes.rows[0]?.id;
  
  if (!tenantId) {
    throw new Error(`Tenant not found for schema: ${schemaName}`);
  }
  
  const planId = await fetchPlanId(db, tenantId);
  const rules = getPlanRules(planId);

  const countRes = await db.query(`SELECT COUNT(*) FROM ${schemaName}.nozzles WHERE pump_id = $1`, [pumpId]);
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
