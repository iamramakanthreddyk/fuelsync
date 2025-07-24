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

  // Get overall summary - using nozzle_readings table which is the actual source
  const summaryQuery = `
    SELECT 
      COUNT(*) as total_entries,
      COALESCE(SUM(nr.volume), 0) as total_volume,
      COALESCE(SUM(nr.amount), 0) as total_amount,
      COALESCE(SUM(CASE WHEN nr.payment_method = 'cash' THEN nr.amount ELSE 0 END), 0) as cash_amount,
      COALESCE(SUM(CASE WHEN nr.payment_method = 'card' THEN nr.amount ELSE 0 END), 0) as card_amount,
      COALESCE(SUM(CASE WHEN nr.payment_method = 'upi' THEN nr.amount ELSE 0 END), 0) as upi_amount,
      COALESCE(SUM(CASE WHEN nr.payment_method = 'credit' THEN nr.amount ELSE 0 END), 0) as credit_amount
    FROM public.nozzle_readings nr
    JOIN public.nozzles n ON nr.nozzle_id = n.id
    JOIN public.pumps p ON n.pump_id = p.id
    JOIN public.stations st ON p.station_id = st.id
    WHERE DATE(nr.recorded_at AT TIME ZONE 'UTC') = $1 
      AND nr.tenant_id = $2
  `;

  // Get nozzle-wise entries
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
      COALESCE(SUM(nr.volume), 0) as total_volume,
      COALESCE(SUM(nr.amount), 0) as total_amount,
      MAX(nr.recorded_at) as last_entry_time,
      CASE 
        WHEN COUNT(nr.id) > 0 THEN COALESCE(SUM(nr.amount), 0) / COUNT(nr.id)
        ELSE 0 
      END as average_ticket_size
    FROM public.nozzles n
    JOIN public.pumps p ON n.pump_id = p.id
    JOIN public.stations st ON p.station_id = st.id
    LEFT JOIN public.nozzle_readings nr ON n.id = nr.nozzle_id 
      AND DATE(nr.recorded_at AT TIME ZONE 'UTC') = $1 
      AND nr.tenant_id = $2
    WHERE st.tenant_id = $2
    GROUP BY n.id, n.nozzle_number, n.fuel_type, p.id, p.name, st.id, st.name
    HAVING COUNT(nr.id) > 0
    ORDER BY total_amount DESC, st.name, p.name, n.nozzle_number
  `;

  // Get sales by fuel type
  const fuelBreakdownQuery = `
    SELECT 
      n.fuel_type,
      COALESCE(SUM(nr.volume), 0) as total_volume,
      COALESCE(SUM(nr.amount), 0) as total_amount,
      COUNT(nr.id) as entries_count,
      CASE 
        WHEN SUM(nr.volume) > 0 THEN SUM(nr.amount) / SUM(nr.volume)
        ELSE 0 
      END as average_price,
      COUNT(DISTINCT st.id) as stations_count
    FROM public.nozzle_readings nr
    JOIN public.nozzles n ON nr.nozzle_id = n.id
    JOIN public.pumps p ON n.pump_id = p.id
    JOIN public.stations st ON p.station_id = st.id
    WHERE DATE(nr.recorded_at AT TIME ZONE 'UTC') = $1 
      AND nr.tenant_id = $2
    GROUP BY n.fuel_type
    ORDER BY total_amount DESC
  `;

  // Get sales by station
  const stationBreakdownQuery = `
    SELECT 
      st.id as station_id,
      st.name as station_name,
      COALESCE(SUM(nr.volume), 0) as total_volume,
      COALESCE(SUM(nr.amount), 0) as total_amount,
      COUNT(nr.id) as entries_count,
      array_agg(DISTINCT n.fuel_type) as fuel_types,
      COUNT(DISTINCT n.id) as nozzles_active,
      MAX(nr.recorded_at) as last_activity
    FROM public.nozzle_readings nr
    JOIN public.nozzles n ON nr.nozzle_id = n.id
    JOIN public.pumps p ON n.pump_id = p.id
    JOIN public.stations st ON p.station_id = st.id
    WHERE DATE(nr.recorded_at AT TIME ZONE 'UTC') = $1 
      AND nr.tenant_id = $2
    GROUP BY st.id, st.name
    ORDER BY total_amount DESC
  `;

  // Get credit sales
  const creditSalesQuery = `
    SELECT 
      c.id as creditor_id,
      c.party_name as creditor_name,
      st.id as station_id,
      st.name as station_name,
      COALESCE(SUM(nr.amount), 0) as total_amount,
      COUNT(nr.id) as entries_count,
      MAX(nr.recorded_at) as last_credit_time
    FROM public.nozzle_readings nr
    JOIN public.nozzles n ON nr.nozzle_id = n.id
    JOIN public.pumps p ON n.pump_id = p.id
    JOIN public.stations st ON p.station_id = st.id
    LEFT JOIN public.creditors c ON nr.creditor_id = c.id
    WHERE DATE(nr.recorded_at AT TIME ZONE 'UTC') = $1 
      AND nr.tenant_id = $2
      AND nr.payment_method = 'credit'
      AND c.id IS NOT NULL
    GROUP BY c.id, c.party_name, st.id, st.name
    ORDER BY total_amount DESC
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
    db.query(creditSalesQuery, [dateStr, tenantId])
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
    creditSales: parseRows(creditSalesResult.rows)
  };
}