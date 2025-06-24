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

export async function listStations(db: Pool, tenantId: string, includeMetrics = false) {
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

  const stations = res.rows;
  if (!includeMetrics) return stations;

  for (const st of stations) {
    const metrics = await getStationMetrics(db, tenantId, st.id, 'today');
    st.metrics = metrics;
  }
  return stations;
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

export async function getStationMetrics(db: Pool, tenantId: string, stationId: string, period: string) {
  let dateFilter = '';
  switch (period) {
    case 'today':
      dateFilter = "AND s.recorded_at >= CURRENT_DATE";
      break;
    case 'monthly':
      dateFilter = "AND s.recorded_at >= CURRENT_DATE - INTERVAL '30 days'";
      break;
    default:
      break;
  }
  const query = `
    SELECT
      COALESCE(SUM(s.amount),0) as amount,
      COALESCE(SUM(s.volume),0) as volume,
      COUNT(s.id) as count
    FROM ${tenantId}.sales s
    JOIN ${tenantId}.nozzles n ON s.nozzle_id = n.id
    JOIN ${tenantId}.pumps p ON n.pump_id = p.id
    WHERE p.station_id = $1 ${dateFilter}
  `;
  const res = await db.query(query, [stationId]);
  return {
    totalSales: parseFloat(res.rows[0].amount),
    totalVolume: parseFloat(res.rows[0].volume),
    transactionCount: parseInt(res.rows[0].count)
  };
}

export async function getStationPerformance(db: Pool, tenantId: string, stationId: string, range: string) {
  const current = await getStationMetrics(db, tenantId, stationId, range);
  let previousFilter = '';
  if (range === 'monthly') previousFilter = "AND s.recorded_at >= CURRENT_DATE - INTERVAL '60 days' AND s.recorded_at < CURRENT_DATE - INTERVAL '30 days'";
  else previousFilter = "AND s.recorded_at >= CURRENT_DATE - INTERVAL '2 days' AND s.recorded_at < CURRENT_DATE";
  const query = `
    SELECT
      COALESCE(SUM(s.amount),0) as amount,
      COALESCE(SUM(s.volume),0) as volume
    FROM ${tenantId}.sales s
    JOIN ${tenantId}.nozzles n ON s.nozzle_id = n.id
    JOIN ${tenantId}.pumps p ON n.pump_id = p.id
    WHERE p.station_id = $1 ${previousFilter}
  `;
  const res = await db.query(query, [stationId]);
  const prevAmount = parseFloat(res.rows[0].amount);
  const prevVolume = parseFloat(res.rows[0].volume);
  const growth = prevAmount ? ((current.totalSales - prevAmount) / prevAmount) * 100 : null;
  return { ...current, previousSales: prevAmount, previousVolume: prevVolume, growth };
}
