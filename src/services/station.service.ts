import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { beforeCreateStation } from '../middleware/planEnforcement';
import { parseRows, parseRow } from '../utils/parseDb';

export async function createStation(db: Pool, tenantId: string, name: string, address?: string): Promise<string> {
  const client = await db.connect();
  try {
    // Enforce plan limits using tenant id
    await beforeCreateStation(prisma, tenantId);

    const res = await client.query<{ id: string }>(
      'INSERT INTO public.stations (id, tenant_id, name, address, updated_at) VALUES ($1,$2,$3,$4,NOW()) RETURNING id',
      [randomUUID(), tenantId, name, address || null]
    );
    return res.rows[0].id;
  } finally {
    client.release();
  }
}

export async function getStation(db: Pool, tenantId: string, stationId: string, includeMetrics = false) {
  const res = await db.query(
    `SELECT
      s.id,
      s.name,
      s.status,
      s.address,
      NULL as manager,
      0 as "attendantCount",
      (
        SELECT COUNT(*) FROM public.pumps p WHERE p.station_id = s.id
      ) as "pumpCount",
      s.created_at as "createdAt"
    FROM public.stations s
    WHERE s.id = $1 AND s.tenant_id = $2`,
    [stationId, tenantId]
  );

  if (res.rows.length === 0) {
    throw new Error(`Station not found: ${stationId}`);
  }

  const station = parseRow(res.rows[0]);
  
  if (includeMetrics) {
    station.metrics = await getStationMetrics(db, tenantId, stationId, 'today');
  }
  
  return station;
}

export async function listStations(db: Pool, tenantId: string, includeMetrics = false) {
  const res = await db.query(
    `SELECT
      s.id,
      s.name,
      s.status,
      s.address,
      NULL as manager,
      0 as "attendantCount",
      (
        SELECT COUNT(*) FROM public.pumps p WHERE p.station_id = s.id
      ) as "pumpCount",
      s.created_at as "createdAt"
    FROM public.stations s
    WHERE s.tenant_id = $1
    ORDER BY s.name`,
    [tenantId]
  );

  const stations = parseRows(res.rows);
  if (!includeMetrics) return stations;

  for (const st of stations) {
    const metrics = await getStationMetrics(db, tenantId, st.id, 'today');
    st.metrics = metrics;
  }
  return stations;
}



export async function updateStation(db: Pool, tenantId: string, id: string, name?: string) {
  await db.query(
    'UPDATE public.stations SET name = COALESCE($3,name) WHERE id = $1 AND tenant_id = $2',
    [id, tenantId, name || null]
  );
}

export async function deleteStation(db: Pool, tenantId: string, id: string) {
  await db.query('DELETE FROM public.stations WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
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
    FROM public.sales s
    JOIN public.nozzles n ON s.nozzle_id = n.id
    JOIN public.pumps p ON n.pump_id = p.id
    WHERE p.station_id = $1 AND s.tenant_id = $2 ${dateFilter}
  `;
  const res = await db.query(query, [stationId, tenantId]);
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
    FROM public.sales s
    JOIN public.nozzles n ON s.nozzle_id = n.id
    JOIN public.pumps p ON n.pump_id = p.id
    WHERE p.station_id = $1 AND s.tenant_id = $2 ${previousFilter}
  `;
  const res = await db.query(query, [stationId, tenantId]);
  const prevAmount = parseFloat(res.rows[0].amount);
  const prevVolume = parseFloat(res.rows[0].volume);
  const growth = prevAmount ? ((current.totalSales - prevAmount) / prevAmount) * 100 : null;
  return { ...current, previousSales: prevAmount, previousVolume: prevVolume, growth };
}

export async function getStationComparison(tenantId: string, stationIds: string[], period: string) {
  const interval = period === 'monthly' ? '30 days' : period === 'weekly' ? '7 days' : '1 day';
  const query = Prisma.sql`
    SELECT
      st.id,
      st.name,
      COALESCE(SUM(s.amount), 0) as total_sales,
      COALESCE(SUM(s.profit), 0) as total_profit,
      COALESCE(SUM(s.volume), 0) as total_volume,
      COUNT(s.id) as transaction_count,
      COALESCE(AVG(s.amount), 0) as avg_transaction,
      CASE WHEN SUM(s.amount) > 0 THEN (SUM(s.profit) / SUM(s.amount)) * 100 ELSE 0 END as profit_margin
    FROM stations st
    LEFT JOIN sales s ON st.id = s.station_id AND s.tenant_id = ${tenantId}
      AND s.recorded_at >= CURRENT_DATE - INTERVAL '${interval}'
    WHERE st.id IN (${Prisma.join(stationIds)}) AND st.tenant_id = ${tenantId}
    GROUP BY st.id, st.name
    ORDER BY total_sales DESC`;
  const rows = (await prisma.$queryRaw(query)) as any[];
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    totalSales: parseFloat(row.total_sales),
    totalProfit: parseFloat(row.total_profit),
    totalVolume: parseFloat(row.total_volume),
    transactionCount: parseInt(row.transaction_count),
    avgTransaction: parseFloat(row.avg_transaction),
    profitMargin: parseFloat(row.profit_margin),
  }));
}

export async function getStationRanking(db: Pool, tenantId: string, metric: string, period: string) {
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
    FROM public.stations st
    LEFT JOIN public.sales s ON st.id = s.station_id AND s.tenant_id = $1
      AND s.recorded_at >= CURRENT_DATE - INTERVAL '${interval}'
    WHERE st.tenant_id = $1
    GROUP BY st.id, st.name
    ORDER BY ${orderBy} DESC
  `;
  const result = await db.query(query, [tenantId]);
  return parseRows(
    result.rows.map((row: any) => ({
      rank: parseInt(row.rank),
      id: row.id,
      name: row.name,
      totalSales: parseFloat(row.total_sales),
      totalProfit: parseFloat(row.total_profit),
      totalVolume: parseFloat(row.total_volume),
      transactionCount: parseInt(row.transaction_count)
    }))
  );
}

export async function getStationEfficiency(db: Pool, tenantId: string, stationId: string) {
  const query = `
    SELECT
      st.id,
      st.name,
      COUNT(DISTINCT p.id) as pump_count,
      COALESCE(SUM(s.amount), 0) as total_sales,
      CASE WHEN COUNT(DISTINCT p.id) > 0
           THEN COALESCE(SUM(s.amount), 0) / COUNT(DISTINCT p.id)
           ELSE 0 END as efficiency
    FROM public.stations st
    LEFT JOIN public.pumps p ON p.station_id = st.id
    LEFT JOIN public.sales s ON s.station_id = st.id AND s.tenant_id = $2
    WHERE st.id = $1 AND st.tenant_id = $2
    GROUP BY st.id, st.name`;
  const result = await db.query(query, [stationId, tenantId]);
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    stationId: row.id,
    stationName: row.name,
    efficiency: parseFloat(row.efficiency)
  };
}

export async function getDashboardStationMetrics(db: Pool, tenantId: string) {
  const query = `
    SELECT
      st.id,
      st.name,
      st.status,
      COUNT(p.id) FILTER (WHERE p.status = 'active') AS active_pumps,
      COUNT(p.id) AS total_pumps,
      MAX(sa.recorded_at) AS last_activity,
      COALESCE(SUM(CASE WHEN sa.recorded_at >= CURRENT_DATE THEN sa.amount ELSE 0 END),0) AS today_sales,
      COALESCE(SUM(CASE WHEN sa.recorded_at >= CURRENT_DATE - INTERVAL '30 days' THEN sa.amount ELSE 0 END),0) AS monthly_sales,
      COALESCE(SUM(CASE WHEN sa.recorded_at >= CURRENT_DATE - INTERVAL '60 days' AND sa.recorded_at < CURRENT_DATE - INTERVAL '30 days' THEN sa.amount ELSE 0 END),0) AS prev_month_sales
    FROM public.stations st
    LEFT JOIN public.pumps p ON p.station_id = st.id
    LEFT JOIN public.sales sa ON sa.station_id = st.id AND sa.tenant_id = $1
    WHERE st.tenant_id = $1
    GROUP BY st.id, st.name, st.status
    ORDER BY st.name`;

  const result = await db.query(query, [tenantId]);

  return result.rows.map((row: any) => {
    const monthlySales = parseFloat(row.monthly_sales);
    const prev = parseFloat(row.prev_month_sales);
    const growth = prev > 0 ? ((monthlySales - prev) / prev) * 100 : null;
    const activePumps = parseInt(row.active_pumps, 10);
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      todaySales: parseFloat(row.today_sales),
      monthlySales,
      salesGrowth: growth,
      activePumps,
      totalPumps: parseInt(row.total_pumps, 10),
      lastActivity: row.last_activity,
      efficiency: activePumps > 0 ? monthlySales / activePumps : 0
    };
  });
}