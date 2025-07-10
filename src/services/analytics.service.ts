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
    SELECT date_trunc('hour', recorded_at) AS hour,
           SUM(volume) AS "salesVolume",
           SUM(amount) AS "salesAmount"
    FROM "sales"
    WHERE tenant_id = ${tenantId}
      AND station_id = ${stationId}
      AND recorded_at >= ${dateFrom}
      AND recorded_at <= ${dateTo}
    GROUP BY 1
    ORDER BY 1`;
  
  return prisma.$queryRaw<{ hour: Date; salesVolume: number; salesAmount: number }[]>(query);
}

/** Peak sales hour for a station */
export async function getPeakHours(tenantId: string, stationId: string) {
  const query = Prisma.sql`
    SELECT to_char(date_trunc('hour', recorded_at), 'HH24:MI') AS hour,
           SUM(volume) AS "salesVolume"
    FROM "sales"
    WHERE tenant_id = ${tenantId}
      AND station_id = ${stationId}
    GROUP BY 1
    ORDER BY "salesVolume" DESC
    LIMIT 1`;
  
  return prisma.$queryRaw<{ hour: string; salesVolume: number }[]>(query);
}

/** Fuel performance for a station over a date range */
export async function getFuelPerformance(
  tenantId: string,
  stationId: string,
  dateFrom: Date,
  dateTo: Date
) {
  const query = Prisma.sql`
    SELECT fuel_type AS "fuelType",
           SUM(volume) AS "totalSalesVolume",
           SUM(amount) AS "totalSalesAmount"
    FROM "sales"
    WHERE tenant_id = ${tenantId}
      AND station_id = ${stationId}
      AND recorded_at >= ${dateFrom}
      AND recorded_at <= ${dateTo}
    GROUP BY fuel_type
    ORDER BY fuel_type`;
  
  return prisma.$queryRaw<{
    fuelType: string;
    totalSalesVolume: number;
    totalSalesAmount: number;
  }[]>(query);
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
    where: { tenant_id: tenantId },
    _sum: { volume: true },
  });
  return {
    totalSales: Number(aggregates._sum.amount || 0),
    totalVolume: Number(aggregates._sum.volume || 0),
    transactionCount: aggregates._count._all,
    fuelBreakdown: fuelBreakdown.map((r: typeof fuelBreakdown[number]) => ({
      fuelType: r.fuel_type,
      volume: Number(r._sum.volume || 0),
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
