import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import os from 'os';
import { Pool } from 'pg';

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

export async function getSystemHealth(db: Pool) {
  // simple query to confirm database connectivity
  await db.query('SELECT 1');
  const memoryUsage = process.memoryUsage().rss / 1024 / 1024; // MB
  return {
    uptime: process.uptime(),
    cpuUsage: os.loadavg()[0],
    memoryUsage,
    dbHealthy: true,
    activeConnections: db.totalCount,
  };
}

export async function getTenantDashboardMetrics(db: Pool, tenantId: string) {
  const salesRes = await db.query(
    `SELECT COALESCE(SUM(amount),0) as amount, COALESCE(SUM(volume),0) as volume, COUNT(*) as count
       FROM public.sales WHERE tenant_id = $1`,
    [tenantId]
  );
  const fuelBreakdownRes = await db.query(
    `SELECT fuel_type, SUM(volume) as volume FROM public.sales
       WHERE tenant_id = $1 GROUP BY fuel_type`,
    [tenantId]
  );
  return {
    totalSales: parseFloat(salesRes.rows[0].amount),
    totalVolume: parseFloat(salesRes.rows[0].volume),
    transactionCount: parseInt(salesRes.rows[0].count),
    fuelBreakdown: fuelBreakdownRes.rows.map(r => ({
      fuelType: r.fuel_type,
      volume: parseFloat(r.volume),
    })),
  };
}
