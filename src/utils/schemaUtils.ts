import { Client, Pool, PoolClient } from 'pg';

/** Get all tenant schema names. */
export async function getTenantSchemas(client: Client | Pool | PoolClient): Promise<string[]> {
  const { rows } = await client.query<{ schema_name: string }>(
    'SELECT schema_name FROM public.tenants ORDER BY id'
  );
  return rows.map((r) => r.schema_name);
}

/** Resolve schema name for a given tenant id. */
export async function getSchemaForTenant(
  client: Client,
  tenantId: string
): Promise<string | null> {
  const { rows } = await client.query<{ schema_name: string }>(
    'SELECT schema_name FROM public.tenants WHERE id=$1',
    [tenantId]
  );
  return rows[0]?.schema_name || null;
}


/** Validate and return a safe schema name. */
export function getSafeSchema(schema: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error('Invalid schema name');
  }
  return schema;
}
