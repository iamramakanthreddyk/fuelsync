import { Pool } from 'pg';
import { beforeCreateStation } from '../middleware/planEnforcement';

export async function createStation(db: Pool, schemaName: string, name: string): Promise<string> {
  const client = await db.connect();
  try {
    await beforeCreateStation(client, schemaName);
    
    // Get actual tenant UUID from schema name
    const tenantRes = await client.query(
      'SELECT id FROM public.tenants WHERE schema_name = $1',
      [schemaName]
    );
    
    if (tenantRes.rows.length === 0) {
      throw new Error(`Tenant not found for schema: ${schemaName}`);
    }
    
    const tenantId = tenantRes.rows[0].id;
    
    const res = await client.query<{ id: string }>(
      `INSERT INTO ${schemaName}.stations (tenant_id, name) VALUES ($1,$2) RETURNING id`,
      [tenantId, name]
    );
    return res.rows[0].id;
  } finally {
    client.release();
  }
}

export async function listStations(db: Pool, schemaName: string, includeMetrics = false) {
  // Check if we have any stations
  const countRes = await db.query(
    `SELECT COUNT(*) FROM ${schemaName}.stations`
  );
  
  // If no stations, seed some demo data
  if (parseInt(countRes.rows[0].count) === 0) {
    await seedDemoStations(db, schemaName);
  }
  
  const res = await db.query(
    `SELECT
      s.id,
      s.name,
      s.status,
      s.address,
      NULL as manager,
      0 as "attendantCount",
      (
        SELECT COUNT(*) FROM ${schemaName}.pumps p WHERE p.station_id = s.id
      ) as "pumpCount",
      s.created_at as "createdAt"
    FROM ${schemaName}.stations s
    ORDER BY s.name`
  );

  const stations = res.rows;
  if (!includeMetrics) return stations;

  for (const st of stations) {
    const metrics = await getStationMetrics(db, schemaName, st.id, 'today');
    st.metrics = metrics;
  }
  return stations;
}

async function seedDemoStations(db: Pool, schemaName: string) {
  // Get actual tenant UUID
  const tenantRes = await db.query(
    'SELECT id FROM public.tenants WHERE schema_name = $1',
    [schemaName]
  );
  
  if (tenantRes.rows.length === 0) {
    throw new Error(`Tenant not found for schema: ${schemaName}`);
  }
  
  const tenantId = tenantRes.rows[0].id;
  
  const demoStations = [
    'Main Street Station',
    'Highway Junction',
    'City Center Fuels',
    'Riverside Gas Station'
  ];
  
  for (const name of demoStations) {
    await db.query(
      `INSERT INTO ${schemaName}.stations (tenant_id, name) VALUES ($1, $2)`,
      [tenantId, name]
    );
  }
}

export async function updateStation(db: Pool, schemaName: string, id: string, name?: string) {
  await db.query(
    `UPDATE ${schemaName}.stations SET name = COALESCE($2,name) WHERE id = $1`,
    [id, name || null]
  );
}

export async function deleteStation(db: Pool, schemaName: string, id: string) {
  await db.query(`DELETE FROM ${schemaName}.stations WHERE id = $1`, [id]);
}

export async function getStationMetrics(db: Pool, schemaName: string, stationId: string, period: string) {
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
    FROM ${schemaName}.sales s
    JOIN ${schemaName}.nozzles n ON s.nozzle_id = n.id
    JOIN ${schemaName}.pumps p ON n.pump_id = p.id
    WHERE p.station_id = $1 ${dateFilter}
  `;
  const res = await db.query(query, [stationId]);
  return {
    totalSales: parseFloat(res.rows[0].amount),
    totalVolume: parseFloat(res.rows[0].volume),
    transactionCount: parseInt(res.rows[0].count)
  };
}

export async function getStationPerformance(db: Pool, schemaName: string, stationId: string, range: string) {
  const current = await getStationMetrics(db, schemaName, stationId, range);
  let previousFilter = '';
  if (range === 'monthly') previousFilter = "AND s.recorded_at >= CURRENT_DATE - INTERVAL '60 days' AND s.recorded_at < CURRENT_DATE - INTERVAL '30 days'";
  else previousFilter = "AND s.recorded_at >= CURRENT_DATE - INTERVAL '2 days' AND s.recorded_at < CURRENT_DATE";
  const query = `
    SELECT
      COALESCE(SUM(s.amount),0) as amount,
      COALESCE(SUM(s.volume),0) as volume
    FROM ${schemaName}.sales s
    JOIN ${schemaName}.nozzles n ON s.nozzle_id = n.id
    JOIN ${schemaName}.pumps p ON n.pump_id = p.id
    WHERE p.station_id = $1 ${previousFilter}
  `;
  const res = await db.query(query, [stationId]);
  const prevAmount = parseFloat(res.rows[0].amount);
  const prevVolume = parseFloat(res.rows[0].volume);
  const growth = prevAmount ? ((current.totalSales - prevAmount) / prevAmount) * 100 : null;
  return { ...current, previousSales: prevAmount, previousVolume: prevVolume, growth };
}

export async function getStationComparison(db: Pool, schemaName: string, stationIds: string[], period: string) {
  const interval = period === 'monthly' ? '30 days' : period === 'weekly' ? '7 days' : '1 day';
  const query = `
    SELECT 
      st.id,
      st.name,
      COALESCE(SUM(s.amount), 0) as total_sales,
      COALESCE(SUM(s.profit), 0) as total_profit,
      COALESCE(SUM(s.volume), 0) as total_volume,
      COUNT(s.id) as transaction_count,
      COALESCE(AVG(s.amount), 0) as avg_transaction,
      CASE WHEN SUM(s.amount) > 0 THEN (SUM(s.profit) / SUM(s.amount)) * 100 ELSE 0 END as profit_margin
    FROM ${schemaName}.stations st
    LEFT JOIN ${schemaName}.sales s ON st.id = s.station_id 
      AND s.recorded_at >= CURRENT_DATE - INTERVAL '${interval}'
    WHERE st.id = ANY($1)
    GROUP BY st.id, st.name
    ORDER BY total_sales DESC
  `;
  const result = await db.query(query, [stationIds]);
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    totalSales: parseFloat(row.total_sales),
    totalProfit: parseFloat(row.total_profit),
    totalVolume: parseFloat(row.total_volume),
    transactionCount: parseInt(row.transaction_count),
    avgTransaction: parseFloat(row.avg_transaction),
    profitMargin: parseFloat(row.profit_margin)
  }));
}

export async function getStationRanking(db: Pool, schemaName: string, metric: string, period: string) {
  const interval = period === 'monthly' ? '30 days' : period === 'weekly' ? '7 days' : '1 day';
  const orderBy = metric === 'profit' ? 'total_profit' : metric === 'volume' ? 'total_volume' : 'total_sales';
  const query = `
    SELECT 
      st.id,
      st.name,
      COALESCE(SUM(s.amount), 0) as total_sales,
      COALESCE(SUM(s.profit), 0) as total_profit,
      COALESCE(SUM(s.volume), 0) as total_volume,
      COUNT(s.id) as transaction_count,
      RANK() OVER (ORDER BY COALESCE(SUM(${orderBy === 'total_sales' ? 's.amount' : orderBy === 'total_profit' ? 's.profit' : 's.volume'}), 0) DESC) as rank
    FROM ${schemaName}.stations st
    LEFT JOIN ${schemaName}.sales s ON st.id = s.station_id 
      AND s.recorded_at >= CURRENT_DATE - INTERVAL '${interval}'
    GROUP BY st.id, st.name
    ORDER BY ${orderBy} DESC
  `;
  const result = await db.query(query);
  return result.rows.map(row => ({
    rank: parseInt(row.rank),
    id: row.id,
    name: row.name,
    totalSales: parseFloat(row.total_sales),
    totalProfit: parseFloat(row.total_profit),
    totalVolume: parseFloat(row.total_volume),
    transactionCount: parseInt(row.transaction_count)
  }));
}
