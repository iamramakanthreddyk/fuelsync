import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { parseRows, parseRow } from '../utils/parseDb';
import { stationBelongsToTenant } from '../utils/hasStationAccess';

export interface ReconciliationRecordResult {
  totalSales: number;
  cashTotal: number;
  cardTotal: number;
  upiTotal: number;
  creditTotal: number;
  openingReading: number;
  closingReading: number;
  variance: number;
}

export async function isFinalized(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: Date
): Promise<boolean> {
  const res = await db.query(
    'SELECT finalized FROM public.day_reconciliations WHERE station_id = $1 AND date = $2 AND tenant_id = $3',
    [stationId, date, tenantId]
  );
  return res.rowCount ? res.rows[0].finalized : false;
}

// Backwards compatibility alias
export const isDayFinalized = isFinalized;

export async function isDateFinalized(
  db: Pool | PoolClient,
  tenantId: string,
  date: Date
): Promise<boolean> {
  const res = await db.query(
    'SELECT 1 FROM public.day_reconciliations WHERE date = $1 AND finalized = true AND tenant_id = $2 LIMIT 1',
    [date, tenantId]
  );
  return !!res.rowCount;
}

export interface DayReconciliationRow {
  id: string;
  station_id: string;
  date: Date;
  total_sales: number;
  cash_total: number;
  card_total: number;
  upi_total: number;
  credit_total: number;
  opening_reading: number;
  closing_reading: number;
  variance: number;
  finalized: boolean;
}

export async function getOrCreateDailyReconciliation(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: Date
): Promise<DayReconciliationRow> {
  const existing = await db.query<DayReconciliationRow>(
    'SELECT * FROM public.day_reconciliations WHERE station_id = $1 AND date = $2 AND tenant_id = $3',
    [stationId, date, tenantId]
  );
  if (existing.rowCount) return existing.rows[0];

  const stationCheck = await stationBelongsToTenant(db, stationId, tenantId);
  if (!stationCheck) {
    throw new Error('Station not found');
  }

  const id = randomUUID();
  const insert = await db.query<DayReconciliationRow>(
    `INSERT INTO public.day_reconciliations (id, tenant_id, station_id, date, finalized)
     VALUES ($1,$2,$3,$4,false)
     RETURNING *`,
    [id, tenantId, stationId, date]
  );
  return insert.rows[0];
}

export async function markDayAsFinalized(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: Date
): Promise<void> {
  const rec = await getOrCreateDailyReconciliation(db, tenantId, stationId, date);
  await db.query(
    'UPDATE public.day_reconciliations SET finalized = true, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
    [rec.id, tenantId]
  );
}

export async function runReconciliation(
  db: Pool,
  tenantId: string,
  stationId: string,
  date: Date
): Promise<ReconciliationRecordResult & { reconciliationId: string }> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const rec = await getOrCreateDailyReconciliation(client, tenantId, stationId, date);
    if (rec.finalized) {
      await client.query('COMMIT');
      return {
        totalSales: Number(rec.total_sales),
        cashTotal: Number(rec.cash_total),
        cardTotal: Number(rec.card_total),
        upiTotal: Number(rec.upi_total),
        creditTotal: Number(rec.credit_total),
        openingReading: Number(rec.opening_reading),
        closingReading: Number(rec.closing_reading),
        variance: Number(rec.variance),
        reconciliationId: rec.id
      };
    }

    const totals = await client.query<{
      total_sales: number;
      cash_total: number;
      card_total: number;
      upi_total: number;
      credit_total: number;
    }>(
      `SELECT
        COALESCE(SUM(s.amount),0) AS total_sales,
        COALESCE(SUM(CASE WHEN s.payment_method='cash' THEN s.amount ELSE 0 END),0) AS cash_total,
        COALESCE(SUM(CASE WHEN s.payment_method='card' THEN s.amount ELSE 0 END),0) AS card_total,
        COALESCE(SUM(CASE WHEN s.payment_method='upi' THEN s.amount ELSE 0 END),0) AS upi_total,
        COALESCE(SUM(CASE WHEN s.payment_method='credit' THEN s.amount ELSE 0 END),0) AS credit_total
       FROM public.sales s
       JOIN public.nozzles n ON s.nozzle_id = n.id
       JOIN public.pumps p ON n.pump_id = p.id
       WHERE p.station_id = $1 AND DATE(s.recorded_at) = $2 AND s.tenant_id = $3`,
      [stationId, date, tenantId]
    );
    const row = totals.rows[0];

    const volumeRes = await client.query<{ total_volume: number }>(
      `SELECT COALESCE(SUM(s.volume),0) AS total_volume
       FROM public.sales s
       JOIN public.nozzles n ON s.nozzle_id = n.id
       JOIN public.pumps p ON n.pump_id = p.id
       WHERE p.station_id = $1 AND DATE(s.recorded_at) = $2 AND s.tenant_id = $3`,
      [stationId, date, tenantId]
    );

    const readingRes = await client.query<{
      opening_reading: number;
      closing_reading: number;
    }>(
      `SELECT
         SUM(opening_reading) AS opening_reading,
         SUM(closing_reading) AS closing_reading
       FROM (
         SELECT MIN(nr.reading) AS opening_reading, MAX(nr.reading) AS closing_reading
           FROM public.nozzle_readings nr
           JOIN public.nozzles n ON nr.nozzle_id = n.id
           JOIN public.pumps p ON n.pump_id = p.id
          WHERE p.station_id = $1
            AND DATE(nr.recorded_at) = $2
            AND nr.tenant_id = $3
          GROUP BY nr.nozzle_id
       ) r`,
      [stationId, date, tenantId]
    );

    const openingReading = Number(readingRes.rows[0]?.opening_reading || 0);
    const closingReading = Number(readingRes.rows[0]?.closing_reading || 0);
    const totalVolume = Number(volumeRes.rows[0]?.total_volume || 0);
    const variance = closingReading - openingReading - totalVolume;
    const reconciliationId = rec.id;

    // Only finalize if there are actual readings and sales data
    const hasReadings = openingReading > 0 || closingReading > 0;
    const hasSales = Number(row.total_sales) > 0;
    const shouldFinalize = hasReadings && hasSales;
    
    await client.query(
      `UPDATE public.day_reconciliations
         SET total_sales=$2, cash_total=$3, card_total=$4, upi_total=$5, credit_total=$6,
             opening_reading=$7, closing_reading=$8, variance=$9,
             finalized=$11, updated_at=NOW()
       WHERE id=$1 AND tenant_id = $10`,
      [reconciliationId, row.total_sales, row.cash_total, row.card_total, row.upi_total, row.credit_total,
       openingReading, closingReading, variance, tenantId, shouldFinalize]
    );
    
    // Check for cash reports on this date and create reconciliation diff if found
    const cashReportRes = await client.query(
      `SELECT id, cash_amount FROM public.cash_reports 
       WHERE station_id = $1 AND date = $2 AND tenant_id = $3`,
      [stationId, date, tenantId]
    );
    
    if (cashReportRes.rowCount) {
      const cashReport = cashReportRes.rows[0];
      const reportedCash = parseFloat(cashReport.cash_amount);
      const actualCash = Number(row.cash_total);
      const difference = reportedCash - actualCash;
      const status = difference === 0 ? 'match' : (difference > 0 ? 'over' : 'short');
      
      // Check if reconciliation diff already exists
      const diffRes = await client.query(
        `SELECT id FROM public.reconciliation_diff 
         WHERE cash_report_id = $1 AND reconciliation_id = $2`,
        [cashReport.id, reconciliationId]
      );
      
      if (!diffRes.rowCount) {
        await client.query(
          `INSERT INTO public.reconciliation_diff 
           (id, tenant_id, station_id, date, reported_cash, actual_cash, difference, status, cash_report_id, reconciliation_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [randomUUID(), tenantId, stationId, date, reportedCash, actualCash, difference, status, cashReport.id, reconciliationId]
        );
      }
    }
    await client.query('COMMIT');
    return {
      totalSales: Number(row.total_sales),
      cashTotal: Number(row.cash_total),
      cardTotal: Number(row.card_total),
      upiTotal: Number(row.upi_total),
      creditTotal: Number(row.credit_total),
      openingReading,
      closingReading,
      variance,
      reconciliationId
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getReconciliation(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: Date
) {
  const row = await getOrCreateDailyReconciliation(db, tenantId, stationId, date);
  return parseRow(row as any);
}

export async function listReconciliations(
  db: Pool,
  tenantId: string,
  stationId?: string
) {
  const params: any[] = [tenantId];
  let idx = 2;
  let query = `SELECT id, station_id, date, total_sales, cash_total, card_total, upi_total, credit_total,
               opening_reading, closing_reading, variance, finalized
               FROM public.day_reconciliations WHERE tenant_id = $1`;
  if (stationId) {
    query += ` AND station_id = $${idx++}`;
    params.push(stationId);
  }
  query += ' ORDER BY date DESC';
  const res = await db.query(query, params);
  return parseRows(res.rows);
}
