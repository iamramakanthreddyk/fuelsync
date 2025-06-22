import { Pool } from 'pg';
import { beforeCreateStation } from '../middleware/planEnforcement';

export async function createStation(db: Pool, tenantId: string, name: string): Promise<string> {
  const client = await db.connect();
  try {
    await beforeCreateStation(client, tenantId);
    const res = await client.query<{ id: string }>(
      `INSERT INTO ${tenantId}.stations (tenant_id, name) VALUES ($1,$2) RETURNING id`,
      [tenantId, name]
    );
    return res.rows[0].id;
  } finally {
    client.release();
  }
}

export async function listStations(db: Pool, tenantId: string) {
  const res = await db.query(
    `SELECT id, name, created_at FROM ${tenantId}.stations ORDER BY name`
  );
  return res.rows;
}

export async function updateStation(db: Pool, tenantId: string, id: string, name?: string) {
  await db.query(
    `UPDATE ${tenantId}.stations SET name = COALESCE($2,name) WHERE id = $1`,
    [id, name || null]
  );
}

export async function deleteStation(db: Pool, tenantId: string, id: string) {
  await db.query(`DELETE FROM ${tenantId}.stations WHERE id = $1`, [id]);
}
