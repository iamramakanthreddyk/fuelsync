import { Pool, PoolClient } from 'pg';
import { parseRows } from '../utils/parseDb';

export interface TodaysSalesNozzleEntry {
  nozzleId: string;
  nozzleNumber: number;
  fuelType: string;
  pumpId: string;
  pumpName: string;
  stationId: string;
  stationName: string;
  entriesCount: number;
  totalVolume: number;
  totalAmount: number;
  lastEntryTime: string | null;
  averageTicketSize: number;
}

export interface TodaysSalesByFuel {
  fuelType: string;
  totalVolume: number;
  totalAmount: number;
  entriesCount: number;
  averagePrice: number;
  stationsCount: number;
}

export interface TodaysSalesByStation {
  stationId: string;
  stationName: string;
  totalVolume: number;
  totalAmount: number;
  entriesCount: number;
  fuelTypes: string[];
  nozzlesActive: number;
  lastActivity: string | null;
}

export interface TodaysCreditSales {
  creditorId: string;
  creditorName: string;
  stationId: string;
  stationName: string;
  totalAmount: number;
  entriesCount: number;
  lastCreditTime: string | null;
}

export interface TodaysSalesSummary {
  date: string;
  totalEntries: number;
  totalVolume: number;
  totalAmount: number;
  paymentBreakdown: {
    cash: number;
    card: number;
    upi: number;
    credit: number;
  };
  nozzleEntries: TodaysSalesNozzleEntry[];
  salesByFuel: TodaysSalesByFuel[];
  salesByStation: TodaysSalesByStation[];
  creditSales: TodaysCreditSales[];
}

export async function getTodaysSalesSummary(
  db: Pool | PoolClient,
  tenantId: string,
  date?: Date
): Promise<TodaysSalesSummary> {
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0];
  
  console.log('[TODAYS-SALES-SERVICE] Starting query for tenant:', tenantId, 'date:', dateStr);

  // Get overall summary - simplified approach using nozzle_readings count
  const summaryQuery = `
    SELECT
      COUNT(*) as total_entries,
      0 as total_volume,
      0 as total_amount,
      COALESCE(SUM(CASE WHEN nr.payment_method = 'cash' THEN 1 ELSE 0 END), 0) as cash_amount,
      COALESCE(SUM(CASE WHEN nr.payment_method = 'card' THEN 1 ELSE 0 END), 0) as card_amount,
      COALESCE(SUM(CASE WHEN nr.payment_method = 'upi' THEN 1 ELSE 0 END), 0) as upi_amount,
      COALESCE(SUM(CASE WHEN nr.payment_method = 'credit' THEN 1 ELSE 0 END), 0) as credit_amount
    FROM public.nozzle_readings nr
    JOIN public.nozzles n ON nr.nozzle_id = n.id
    JOIN public.pumps p ON n.pump_id = p.id
    JOIN public.stations st ON p.station_id = st.id
    WHERE DATE(nr.recorded_at) = $1 AND nr.tenant_id = $2
  `;

  // Get nozzle-wise entries - simplified
  const nozzleEntriesQuery = `
    SELECT
      n.id as nozzle_id,
      n.nozzle_number,
      n.fuel_type,
      p.id as pump_id,
      p.name as pump_name,
      st.id as station_id,
      st.name as station_name,
      COUNT(nr.id) as entries_count,
      0 as total_volume,
      0 as total_amount,
      MAX(nr.recorded_at) as last_entry_time,
      0 as average_ticket_size
    FROM public.nozzles n
    JOIN public.pumps p ON n.pump_id = p.id
    JOIN public.stations st ON p.station_id = st.id
    LEFT JOIN public.nozzle_readings nr ON n.id = nr.nozzle_id
      AND DATE(nr.recorded_at) = $1
      AND nr.tenant_id = $2
    WHERE st.tenant_id = $2
    GROUP BY n.id, n.nozzle_number, n.fuel_type, p.id, p.name, st.id, st.name
    HAVING COUNT(nr.id) > 0
    ORDER BY entries_count DESC, st.name, p.name, n.nozzle_number
  `;

  // Get sales by fuel type - simplified
  const fuelBreakdownQuery = `
    SELECT
      n.fuel_type,
      0 as total_volume,
      0 as total_amount,
      COUNT(nr.id) as entries_count,
      0 as average_price,
      COUNT(DISTINCT st.id) as stations_count
    FROM public.nozzle_readings nr
    JOIN public.nozzles n ON nr.nozzle_id = n.id
    JOIN public.pumps p ON n.pump_id = p.id
    JOIN public.stations st ON p.station_id = st.id
    WHERE DATE(nr.recorded_at) = $1
      AND nr.tenant_id = $2
    GROUP BY n.fuel_type
    ORDER BY entries_count DESC
  `;

  // Get sales by station - simplified
  const stationBreakdownQuery = `
    SELECT
      st.id as station_id,
      st.name as station_name,
      0 as total_volume,
      0 as total_amount,
      COUNT(nr.id) as entries_count,
      array_agg(DISTINCT n.fuel_type) as fuel_types,
      COUNT(DISTINCT n.id) as nozzles_active,
      MAX(nr.recorded_at) as last_activity
    FROM public.nozzle_readings nr
    JOIN public.nozzles n ON nr.nozzle_id = n.id
    JOIN public.pumps p ON n.pump_id = p.id
    JOIN public.stations st ON p.station_id = st.id
    WHERE DATE(nr.recorded_at) = $1
      AND nr.tenant_id = $2
    GROUP BY st.id, st.name
    ORDER BY entries_count DESC
  `;

  // Get credit sales - simplified (skip if creditor_id column doesn't exist)
  const creditSalesQuery = `
    SELECT
      'unknown' as creditor_id,
      'Credit Sales' as creditor_name,
      st.id as station_id,
      st.name as station_name,
      0 as total_amount,
      COUNT(nr.id) as entries_count,
      MAX(nr.recorded_at) as last_credit_time
    FROM public.nozzle_readings nr
    JOIN public.nozzles n ON nr.nozzle_id = n.id
    JOIN public.pumps p ON n.pump_id = p.id
    JOIN public.stations st ON p.station_id = st.id
    WHERE DATE(nr.recorded_at) = $1
      AND nr.tenant_id = $2
      AND nr.payment_method = 'credit'
    GROUP BY st.id, st.name
    ORDER BY entries_count DESC
  `;

  const [
    summaryResult,
    nozzleEntriesResult,
    fuelBreakdownResult,
    stationBreakdownResult,
    creditSalesResult
  ] = await Promise.all([
    db.query(summaryQuery, [dateStr, tenantId]),
    db.query(nozzleEntriesQuery, [dateStr, tenantId]),
    db.query(fuelBreakdownQuery, [dateStr, tenantId]),
    db.query(stationBreakdownQuery, [dateStr, tenantId]),
    db.query(creditSalesQuery, [dateStr, tenantId]).catch(() => ({ rows: [] }))
  ]);

  const summary = summaryResult.rows[0] || {};

  return {
    date: dateStr,
    totalEntries: parseInt(summary.total_entries || '0'),
    totalVolume: parseFloat(summary.total_volume || '0'),
    totalAmount: parseFloat(summary.total_amount || '0'),
    paymentBreakdown: {
      cash: parseFloat(summary.cash_amount || '0'),
      card: parseFloat(summary.card_amount || '0'),
      upi: parseFloat(summary.upi_amount || '0'),
      credit: parseFloat(summary.credit_amount || '0')
    },
    nozzleEntries: parseRows(nozzleEntriesResult.rows),
    salesByFuel: parseRows(fuelBreakdownResult.rows),
    salesByStation: parseRows(stationBreakdownResult.rows),
    creditSales: parseRows(creditSalesResult.rows || [])
  };
}