import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import os from 'os';

/** Hourly sales metrics for a station */
export async function getHourlySales(
  tenantId: string,
  stationId: string,
  dateFrom: Date,
  dateTo: Date
) {
  const query = Prisma.sql`
    SELECT 
      date_trunc('hour', recorded_at) AS hour,
      EXTRACT(HOUR FROM recorded_at) AS hour_num,
      SUM(volume) AS "salesVolume",
      SUM(amount) AS "salesAmount",
      COUNT(*) AS "transactionCount"
    FROM "sales"
    WHERE tenant_id = ${tenantId}
      AND station_id = ${stationId}
      AND recorded_at >= ${dateFrom}
      AND recorded_at <= ${dateTo}
    GROUP BY 1, 2
    ORDER BY 1`;
  
  const results = await prisma.$queryRaw<{ 
    hour: Date; 
    hour_num: number;
    salesVolume: number; 
    salesAmount: number;
    transactionCount: number;
  }[]>(query);
  
  // Format the results for the frontend
  return results.map(row => ({
    hour: row.hour_num,
    date: row.hour.toISOString().split('T')[0],
    revenue: parseFloat(row.salesAmount.toString()),
    volume: parseFloat(row.salesVolume.toString()),
    salesCount: parseInt(row.transactionCount.toString()),
    // Add aliases for compatibility
    sales: parseFloat(row.salesAmount.toString())
  }));
}

/** Peak sales hour for a station */
export async function getPeakHours(tenantId: string, stationId: string) {
  const query = Prisma.sql`
    SELECT 
      EXTRACT(HOUR FROM recorded_at) AS hour_num,
      to_char(date_trunc('hour', recorded_at), 'HH24:MI') AS hour,
      SUM(volume) AS "salesVolume",
      SUM(amount) AS "salesAmount",
      COUNT(*) AS "transactionCount",
      CASE 
        WHEN EXTRACT(HOUR FROM recorded_at) < 12 THEN 'Morning'
        WHEN EXTRACT(HOUR FROM recorded_at) < 17 THEN 'Afternoon'
        ELSE 'Evening'
      END AS time_of_day
    FROM "sales"
    WHERE tenant_id = ${tenantId}
      AND station_id = ${stationId}
    GROUP BY 1, 2, 6
    ORDER BY "salesAmount" DESC
    LIMIT 5`;
  
  const results = await prisma.$queryRaw<{ 
    hour_num: number;
    hour: string; 
    salesVolume: number;
    salesAmount: number;
    transactionCount: number;
    time_of_day: string;
  }[]>(query);
  
  // Format the results for the frontend
  return results.map(row => ({
    hour: row.hour_num,
    timeRange: `${row.hour} (${row.time_of_day})`,
    avgSales: parseFloat(row.salesAmount.toString()),
    avgVolume: parseFloat(row.salesVolume.toString()),
    averageRevenue: parseFloat(row.salesAmount.toString()),
    averageVolume: parseFloat(row.salesVolume.toString()),
    averageSalesCount: parseInt(row.transactionCount.toString())
  }));
}

/** Fuel performance for a station over a date range */
export async function getFuelPerformance(
  tenantId: string,
  stationId: string,
  dateFrom: Date,
  dateTo: Date
) {
  // Get current period data with station information
  const currentQuery = Prisma.sql`
    SELECT 
      s.fuel_type,
      s.station_id,
      st.name as station_name,
      SUM(s.volume) AS total_volume,
      SUM(s.amount) AS total_amount,
      COUNT(*) AS sales_count,
      CASE WHEN SUM(s.volume) > 0 THEN SUM(s.amount) / SUM(s.volume) ELSE 0 END AS average_price
    FROM "sales" s
    LEFT JOIN "stations" st ON s.station_id = st.id
    WHERE s.tenant_id = ${tenantId}
      AND s.station_id = ${stationId}
      AND s.recorded_at >= ${dateFrom}
      AND s.recorded_at <= ${dateTo}
      AND s.fuel_type IS NOT NULL
    GROUP BY s.fuel_type, s.station_id, st.name
    ORDER BY total_amount DESC`;
  
  // Calculate the previous period (same duration, just shifted back)
  const duration = dateTo.getTime() - dateFrom.getTime();
  const prevDateTo = new Date(dateFrom.getTime());
  const prevDateFrom = new Date(dateFrom.getTime() - duration);
  
  // Get previous period data
  const previousQuery = Prisma.sql`
    SELECT 
      fuel_type,
      SUM(volume) AS prev_volume,
      SUM(amount) AS prev_amount
    FROM "sales"
    WHERE tenant_id = ${tenantId}
      AND station_id = ${stationId}
      AND recorded_at >= ${prevDateFrom}
      AND recorded_at <= ${prevDateTo}
      AND fuel_type IS NOT NULL
    GROUP BY fuel_type`;
  
  // Execute both queries
  const [currentResults, previousResults] = await Promise.all([
    prisma.$queryRaw<{
      fuel_type: string;
      station_id: string;
      station_name: string;
      total_volume: number;
      total_amount: number;
      sales_count: number;
      average_price: number;
    }[]>(currentQuery),
    prisma.$queryRaw<{
      fuel_type: string;
      prev_volume: number;
      prev_amount: number;
    }[]>(previousQuery)
  ]);
  
  // Create a map of previous data by fuel type
  const prevDataMap = new Map();
  for (const row of previousResults) {
    prevDataMap.set(row.fuel_type, {
      prevVolume: parseFloat(row.prev_volume?.toString() || '0'),
      prevAmount: parseFloat(row.prev_amount?.toString() || '0')
    });
  }
  
  // Combine current and previous data with growth calculations
  return currentResults.map(row => {
    const prevData = prevDataMap.get(row.fuel_type) || { prevVolume: 0, prevAmount: 0 };
    const currentAmount = parseFloat(row.total_amount?.toString() || '0');
    const prevAmount = prevData.prevAmount;
    
    // Calculate growth percentage
    const growth = prevAmount > 0 ? ((currentAmount - prevAmount) / prevAmount) * 100 : 0;
    
    return {
      fuelType: row.fuel_type || 'Unknown',
      stationId: row.station_id,
      stationName: row.station_name || 'Unknown Station',
      volume: parseFloat(row.total_volume?.toString() || '0'),
      revenue: currentAmount,
      sales: currentAmount,
      salesCount: parseInt(row.sales_count?.toString() || '0'),
      averagePrice: parseFloat(row.average_price?.toString() || '0'),
      growth: parseFloat(growth.toFixed(2)),
      margin: 15, // Placeholder margin
      // Keep original fields for backward compatibility
      totalSalesVolume: parseFloat(row.total_volume?.toString() || '0'),
      totalSalesAmount: currentAmount,
      // Add date range for context
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString()
    };
  });
}

export async function getSystemHealth() {
  const memoryUsage = process.memoryUsage().rss / 1024 / 1024; // MB
  return {
    uptime: process.uptime(),
    cpuUsage: os.loadavg()[0],
    memoryUsage,
    dbHealthy: true,
  };
}

export async function getTenantDashboardMetrics(tenantId: string) {
  const aggregates = await prisma.sale.aggregate({
    where: { tenant_id: tenantId },
    _sum: { amount: true, volume: true },
    _count: { _all: true },
  });
  const fuelBreakdown = await prisma.sale.groupBy({
    by: ['fuel_type'],
    where: { 
      tenant_id: tenantId,
      fuel_type: { not: undefined }
    },
    _sum: { volume: true },
  });
  return {
    totalSales: Number(aggregates._sum.amount || 0),
    totalVolume: Number(aggregates._sum.volume || 0),
    transactionCount: aggregates._count._all,
    fuelBreakdown: fuelBreakdown
      .filter(r => r.fuel_type)
      .map((r: typeof fuelBreakdown[number]) => ({
        fuelType: r.fuel_type || 'unknown',
        volume: Number(r._sum?.volume || 0),
      })),
  };
}

export async function getSuperAdminAnalytics() {
  const [tenantCount, activeTenantCount, suspendedTenantCount, cancelledTenantCount, userCount, stationCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'active' } }),
    prisma.tenant.count({ where: { status: 'suspended' } }),
    prisma.tenant.count({ where: { status: 'cancelled' } }),
    prisma.user.count(),
    prisma.station.count(),
  ]);

  const salesAgg = await prisma.sale.aggregate({
    _sum: { amount: true, volume: true },
    _count: { _all: true },
  });

  const totalRevenue = Number(salesAgg._sum.amount || 0);
  const salesVolume = Number(salesAgg._sum.volume || 0);
  const totalTransactions = salesAgg._count._all;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const signupsThisMonth = await prisma.tenant.count({ where: { created_at: { gte: startOfMonth } } });

  const lastMonthStart = new Date(startOfMonth);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  const signupsLastMonth = await prisma.tenant.count({
    where: { created_at: { gte: lastMonthStart, lt: startOfMonth } },
  });

  const growth = signupsLastMonth > 0 ? ((signupsThisMonth - signupsLastMonth) / signupsLastMonth) * 100 : 0;

  const planTotals = await prisma.tenant.groupBy({
    by: ['plan_id'],
    _count: { _all: true },
  });
  const planMap = await prisma.plan.findMany({ select: { id: true, name: true } });
  const nameMap = Object.fromEntries(planMap.map(p => [p.id, p.name]));
  const tenantsByPlan = planTotals.map(t => ({
    planName: t.plan_id ? nameMap[t.plan_id] || t.plan_id : 'Unassigned',
    count: t._count._all,
    percentage: tenantCount > 0 ? parseFloat(((t._count._all / tenantCount) * 100).toFixed(2)) : 0,
  }));

  const recentTenants = await prisma.tenant.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    select: { id: true, name: true, status: true, created_at: true },
  });

  const monthlyTenants = await prisma.$queryRaw<{ month: string; count: number }[]>(
    Prisma.sql`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
             COUNT(*) as count
      FROM public.tenants
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 6`
  );

  const monthlyRevenue = await prisma.$queryRaw<{ month: string; revenue: number }[]>(
    Prisma.sql`
      SELECT to_char(date_trunc('month', recorded_at), 'YYYY-MM') AS month,
             SUM(amount) as revenue
      FROM public.sales
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 6`
  );

  const monthMap: Record<string, { tenants: number; revenue: number }> = {};
  for (const r of monthlyTenants) monthMap[r.month] = { tenants: Number(r.count), revenue: 0 };
  for (const r of monthlyRevenue) {
    if (!monthMap[r.month]) monthMap[r.month] = { tenants: 0, revenue: Number(r.revenue) };
    else monthMap[r.month].revenue = Number(r.revenue);
  }
  const monthlyGrowth = Object.entries(monthMap)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, vals]) => ({ month, tenants: vals.tenants, revenue: vals.revenue }));

  const topTenants = await prisma.$queryRaw<{ id: string; name: string; stations_count: number; revenue: number }[]>(
    Prisma.sql`
      SELECT t.id, t.name,
             COUNT(s.id) AS stations_count,
             COALESCE(SUM(sl.amount), 0) AS revenue
      FROM public.tenants t
      LEFT JOIN public.stations s ON s.tenant_id = t.id
      LEFT JOIN public.sales sl ON sl.tenant_id = t.id
      GROUP BY t.id
      ORDER BY revenue DESC
      LIMIT 5`
  );

  const overview = {
    totalTenants: tenantCount,
    totalRevenue,
    totalStations: stationCount,
    growth,
  };

  const tenantMetrics = {
    activeTenants: activeTenantCount,
    trialTenants: 0,
    suspendedTenants: suspendedTenantCount,
    monthlyGrowth: signupsThisMonth,
  };

  const revenueMetrics = {
    mrr: 0,
    arr: 0,
    churnRate: 0,
    averageRevenuePerTenant: tenantCount > 0 ? totalRevenue / tenantCount : 0,
  };

  const usageMetrics = {
    totalUsers: userCount,
    totalStations: stationCount,
    totalTransactions,
    averageStationsPerTenant: tenantCount > 0 ? stationCount / tenantCount : 0,
  };

  const formattedTenants = recentTenants.map(t => ({
    id: t.id,
    name: t.name,
    status: t.status,
    created_at: t.created_at.toISOString(),
  }));

  return {
    overview,
    tenantMetrics,
    revenueMetrics,
    usageMetrics,
    totalTenants: tenantCount,
    activeTenants: activeTenantCount,
    totalRevenue,
    salesVolume,
    monthlyGrowth,
    topTenants: topTenants.map(t => ({
      id: t.id,
      name: t.name,
      stationsCount: Number(t.stations_count),
      revenue: Number(t.revenue),
    })),
    tenantCount,
    activeTenantCount,
    totalUsers: userCount,
    signupsThisMonth,
    tenantsByPlan,
    recentTenants: formattedTenants,
  };
}
