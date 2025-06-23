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
  // Check if we have any stations
  const countRes = await db.query(
    `SELECT COUNT(*) FROM ${tenantId}.stations`
  );
  
  // If no stations, seed some demo data
  if (parseInt(countRes.rows[0].count) === 0) {
    await seedDemoStations(db, tenantId);
  }
  
  const res = await db.query(
    `SELECT
      s.id,
      s.name,
      'active' as status,
      NULL as manager,
      (
        SELECT COUNT(*)
        FROM ${tenantId}.user_stations us
        JOIN ${tenantId}.users u ON us.user_id = u.id
        WHERE us.station_id = s.id AND u.role = 'attendant'
      ) as "attendantCount",
      (
        SELECT COUNT(*) FROM ${tenantId}.pumps p WHERE p.station_id = s.id
      ) as "pumpCount",
      s.created_at as "createdAt",
      '' as address
    FROM ${tenantId}.stations s
    ORDER BY s.name`
  );
  
  return res.rows;
}

async function seedDemoStations(db: Pool, tenantId: string) {
  const demoStations = [
    'Main Street Station',
    'Highway Junction',
    'City Center Fuels',
    'Riverside Gas Station'
  ];
  
  for (const name of demoStations) {
    await db.query(
      `INSERT INTO ${tenantId}.stations (tenant_id, name) VALUES ($1, $2)`,
      [tenantId, name]
    );
  }
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
