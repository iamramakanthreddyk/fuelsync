/**
 * @file services/reconciliation.service.ts
 * @description IMPROVED Reconciliation Service - Simple "System vs Reality" comparison
 *
 * FEATURES:
 * - Clear separation of system calculated vs user entered data
 * - Simple difference calculations
 * - Support for backdated day closures
 * - Analytics and reports integration
 * - Backward compatibility with existing data
 */
import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { parseRows, parseRow } from '../utils/parseDb';
import { stationBelongsToTenant } from '../utils/hasStationAccess';

// Clear, simple interfaces for improved reconciliation
export interface SystemCalculatedSales {
  totalVolume: number;
  totalRevenue: number;
  cashSales: number;
  cardSales: number;
  upiSales: number;
  creditSales: number;
  fuelBreakdown: {
    petrol: { volume: number; revenue: number };
    diesel: { volume: number; revenue: number };
    cng?: { volume: number; revenue: number };
    lpg?: { volume: number; revenue: number };
  };
}

export interface UserEnteredCash {
  cashCollected: number;
  cardCollected: number;
  upiCollected: number;
  totalCollected: number;
}

export interface ReconciliationSummary {
  date: string;
  stationId: string;
  stationName: string;

  // System Generated (from nozzle readings)
  systemCalculated: SystemCalculatedSales;

  // User Entered (from cash reports)
  userEntered: UserEnteredCash;

  // Simple Differences
  differences: {
    cashDifference: number;      // userEntered.cashCollected - systemCalculated.cashSales
    cardDifference: number;      // userEntered.cardCollected - systemCalculated.cardSales
    upiDifference: number;       // userEntered.upiCollected - systemCalculated.upiSales
    totalDifference: number;     // userEntered.totalCollected - systemCalculated.totalRevenue (excluding credit)
  };

  // Status
  isReconciled: boolean;
  reconciledBy?: string | null;
  reconciledAt?: Date;
  notes?: string;
  canCloseBackdated?: boolean;  // NEW: Support for backdated closures
}

// Legacy interface for backward compatibility
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
    'SELECT 1 FROM public.day_reconciliations WHERE date = $1::date AND finalized = true AND tenant_id = $2::uuid LIMIT 1',
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
  reported_cash_amount?: number;
  variance_amount?: number;
  variance_reason?: string;
  closed_by?: string | null;
  closed_at?: Date;
}

export async function getOrCreateDailyReconciliation(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: Date
): Promise<DayReconciliationRow> {
  const existing = await db.query<DayReconciliationRow>(
    'SELECT * FROM public.day_reconciliations WHERE station_id = $1::uuid AND date = $2::date AND tenant_id = $3::uuid',
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
     VALUES ($1::uuid,$2::uuid,$3::uuid,$4,false)
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
    'UPDATE public.day_reconciliations SET finalized = true, updated_at = NOW() WHERE id = $1::uuid AND tenant_id = $2::uuid',
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
       WHERE p.station_id = $1::uuid AND DATE(s.recorded_at) = $2::date AND s.tenant_id = $3::uuid`,
      [stationId, date, tenantId]
    );
    const row = totals.rows[0];

    const volumeRes = await client.query<{ total_volume: number }>(
      `SELECT COALESCE(SUM(s.volume),0) AS total_volume
       FROM public.sales s
       JOIN public.nozzles n ON s.nozzle_id = n.id
       JOIN public.pumps p ON n.pump_id = p.id
       WHERE p.station_id = $1::uuid AND DATE(s.recorded_at) = $2::date AND s.tenant_id = $3::uuid`,
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
          WHERE p.station_id = $1::uuid
            AND DATE(nr.recorded_at) = $2::date
            AND nr.tenant_id = $3::uuid
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
       WHERE id=$1::uuid AND tenant_id = $10::uuid`,
      [reconciliationId, row.total_sales, row.cash_total, row.card_total, row.upi_total, row.credit_total,
       openingReading, closingReading, variance, tenantId, shouldFinalize]
    );
    
    // Check for existing day reconciliation on this date
    const existingReconciliationRes = await client.query(
      `SELECT id, cash_total FROM public.day_reconciliations
       WHERE station_id = $1::uuid AND date = $2::date AND tenant_id = $3::uuid`,
      [stationId, date, tenantId]
    );
    
    if (existingReconciliationRes.rowCount) {
      const existingReconciliation = existingReconciliationRes.rows[0];
      const reportedCash = parseFloat(existingReconciliation.cash_total);
      const actualCash = Number(row.cash_total);
      const difference = reportedCash - actualCash;
      const status = difference === 0 ? 'match' : (difference > 0 ? 'over' : 'short');
      
      // Check if reconciliation diff already exists
      const diffRes = await client.query(
        `SELECT id FROM public.reconciliation_diff
         WHERE cash_report_id = $1::uuid AND reconciliation_id = $2::uuid`,
        [existingReconciliation.id, reconciliationId]
      );

      if (!diffRes.rowCount) {
        await client.query(
          `INSERT INTO public.reconciliation_diff
           (id, tenant_id, station_id, date, reported_cash, actual_cash, difference, status, cash_report_id, reconciliation_id)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4::date, $5, $6, $7, $8, $9::uuid, $10::uuid)`,
          [randomUUID(), tenantId, stationId, date, reportedCash, actualCash, difference, status, existingReconciliation.id, reconciliationId]
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
  
  // Only consider it finalized if it has both readings and sales AND was explicitly finalized
  const hasReadings = Number(row.opening_reading) > 0 || Number(row.closing_reading) > 0;
  const hasSales = Number(row.total_sales) > 0;
  const shouldBeFinalized = row.finalized && hasReadings && hasSales;
  
  // Create a new object with the corrected finalized status
  const correctedRow = {
    ...row,
    finalized: shouldBeFinalized
  };
  
  return parseRow(correctedRow as any);
}

export async function listReconciliations(
  db: Pool,
  tenantId: string,
  stationId?: string
) {
  const params: any[] = [tenantId];
  let idx = 2;
  let query = `SELECT id, station_id, date, total_sales, cash_total, card_total, upi_total, credit_total,
               opening_reading, closing_reading, variance, finalized,
               (opening_reading > 0 OR closing_reading > 0) AS has_readings,
               (total_sales > 0) AS has_sales
               FROM public.day_reconciliations WHERE tenant_id = $1::uuid`;
  if (stationId) {
    query += ` AND station_id = $${idx++}::uuid`;
    params.push(stationId);
  }
  query += ' ORDER BY date DESC';
  const res = await db.query(query, params);
  
  // Process the rows to ensure finalized flag is correct
  const rows = res.rows.map(row => {
    // Only consider it finalized if it has both readings and sales AND was explicitly finalized
    const shouldBeFinalized = row.finalized && row.has_readings && row.has_sales;
    return {
      ...row,
      finalized: shouldBeFinalized
    };
  });
  
  return parseRows(rows);
}

// ============================================================================
// IMPROVED RECONCILIATION FUNCTIONS - New "System vs Reality" approach
// ============================================================================

/**
 * IMPROVED: Get system calculated sales for a date
 */
export async function getSystemCalculatedSales(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: string
): Promise<SystemCalculatedSales> {
  const query = `
    SELECT
      s.fuel_type,
      s.payment_method,
      SUM(s.volume) as total_volume,
      SUM(s.amount) as total_amount
    FROM sales s
    WHERE s.tenant_id = $1
      AND s.station_id = $2
      AND DATE(s.recorded_at) = $3
      AND s.status = 'posted'
    GROUP BY s.fuel_type, s.payment_method
    ORDER BY s.fuel_type, s.payment_method
  `;

  const result = await db.query(query, [tenantId, stationId, date]);

  // Initialize totals
  let totalVolume = 0;
  let totalRevenue = 0;
  let cashSales = 0;
  let cardSales = 0;
  let upiSales = 0;
  let creditSales = 0;

  const fuelBreakdown = {
    petrol: { volume: 0, revenue: 0 },
    diesel: { volume: 0, revenue: 0 },
    cng: { volume: 0, revenue: 0 },
    lpg: { volume: 0, revenue: 0 }
  };

  // Process results
  for (const row of result.rows) {
    const volume = Number(row.total_volume);
    const amount = Number(row.total_amount);
    const fuelType = row.fuel_type.toLowerCase();
    const paymentMethod = row.payment_method.toLowerCase();

    // Add to totals
    totalVolume += volume;
    totalRevenue += amount;

    // Add to fuel breakdown
    if (fuelBreakdown[fuelType as keyof typeof fuelBreakdown]) {
      fuelBreakdown[fuelType as keyof typeof fuelBreakdown].volume += volume;
      fuelBreakdown[fuelType as keyof typeof fuelBreakdown].revenue += amount;
    }

    // Add to payment method totals
    switch (paymentMethod) {
      case 'cash':
        cashSales += amount;
        break;
      case 'card':
        cardSales += amount;
        break;
      case 'upi':
        upiSales += amount;
        break;
      case 'credit':
        creditSales += amount;
        break;
    }
  }

  return {
    totalVolume,
    totalRevenue,
    cashSales,
    cardSales,
    upiSales,
    creditSales,
    fuelBreakdown
  };
}

/**
 * IMPROVED: Get user entered cash for a date
 */
export async function getUserEnteredCash(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: string
): Promise<UserEnteredCash> {
  const query = `
    SELECT
      COALESCE(SUM(cash_total), 0) as cash_collected,
      COALESCE(SUM(card_total), 0) as card_collected,
      COALESCE(SUM(upi_total), 0) as upi_collected
    FROM day_reconciliations
    WHERE tenant_id = $1
      AND station_id = $2
      AND date = $3
  `;

  const result = await db.query(query, [tenantId, stationId, date]);
  const row = result.rows[0] || {};

  const cashCollected = Number(row.cash_collected || 0);
  const cardCollected = Number(row.card_collected || 0);
  const upiCollected = Number(row.upi_collected || 0);
  const totalCollected = cashCollected + cardCollected + upiCollected;

  return {
    cashCollected,
    cardCollected,
    upiCollected,
    totalCollected
  };
}

/**
 * IMPROVED: Generate reconciliation summary - the main function
 * Supports backdated closures and integrates with analytics/reports
 */
export async function generateReconciliationSummary(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: string
): Promise<ReconciliationSummary> {
  // Get station name
  const stationResult = await db.query(
    'SELECT name FROM stations WHERE id = $1::uuid AND tenant_id = $2::uuid',
    [stationId, tenantId]
  );
  const stationName = stationResult.rows[0]?.name || 'Unknown Station';

  // Get system calculated sales
  const systemCalculated = await getSystemCalculatedSales(db, tenantId, stationId, date);

  // Get user entered cash
  const userEntered = await getUserEnteredCash(db, tenantId, stationId, date);

  // Calculate simple differences
  const cashDifference = userEntered.cashCollected - systemCalculated.cashSales;
  const cardDifference = userEntered.cardCollected - systemCalculated.cardSales;
  const upiDifference = userEntered.upiCollected - systemCalculated.upiSales;
  const totalDifference = userEntered.totalCollected - (systemCalculated.totalRevenue - systemCalculated.creditSales);

  // Check if reconciled
  const reconciliationResult = await db.query(
    'SELECT finalized, updated_at FROM day_reconciliations WHERE tenant_id = $1::uuid AND station_id = $2::uuid AND date = $3',
    [tenantId, stationId, date]
  );

  const isReconciled = reconciliationResult.rows[0]?.finalized || false;
  const reconciledBy = null; // Not tracked in current schema
  const reconciledAt = reconciliationResult.rows[0]?.updated_at;

  // Check if backdated closure is allowed (within 7 days)
  const today = new Date();
  const reconciliationDate = new Date(date);
  const daysDifference = Math.floor((today.getTime() - reconciliationDate.getTime()) / (1000 * 60 * 60 * 24));
  const canCloseBackdated = daysDifference <= 7; // Allow up to 7 days backdated

  return {
    date,
    stationId,
    stationName,
    systemCalculated,
    userEntered,
    differences: {
      cashDifference,
      cardDifference,
      upiDifference,
      totalDifference
    },
    isReconciled,
    reconciledBy,
    reconciledAt,
    canCloseBackdated
  };
}

/**
 * IMPROVED: Close the day - simple finalization with backdated support
 * This function handles analytics and reports integration
 */
export async function closeDayReconciliation(
  db: Pool,
  tenantId: string,
  stationId: string,
  date: string,
  userId: string,
  notes?: string
): Promise<ReconciliationSummary> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Get the reconciliation summary first
    const summary = await generateReconciliationSummary(client, tenantId, stationId, date);

    // Check if backdated closure is allowed
    if (!summary.canCloseBackdated && !summary.isReconciled) {
      const today = new Date().toISOString().split('T')[0];
      if (date !== today) {
        throw new Error(`Cannot close day for ${date}. Backdated closures are only allowed within 7 days.`);
      }
    }

    // Insert or update day_reconciliations with comprehensive data
    await client.query(`
      INSERT INTO day_reconciliations (
        id, tenant_id, station_id, date,
        total_sales, cash_total, card_total, upi_total, credit_total,
        opening_reading, closing_reading, variance,
        finalized, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, $10, true, NOW()
      )
      ON CONFLICT (tenant_id, station_id, date)
      DO UPDATE SET
        total_sales = EXCLUDED.total_sales,
        cash_total = EXCLUDED.cash_total,
        card_total = EXCLUDED.card_total,
        upi_total = EXCLUDED.upi_total,
        credit_total = EXCLUDED.credit_total,
        variance = EXCLUDED.variance,
        finalized = true,
        updated_at = NOW()
    `, [
      randomUUID(),
      tenantId,
      stationId,
      date,
      summary.systemCalculated.totalRevenue,
      summary.systemCalculated.cashSales,
      summary.systemCalculated.cardSales,
      summary.systemCalculated.upiSales,
      summary.systemCalculated.creditSales,
      summary.differences.totalDifference // Store total difference as variance
    ]);

    // Update sales status to 'finalized' for analytics/reports integration
    await client.query(`
      UPDATE sales
      SET status = 'finalized', updated_at = NOW()
      WHERE tenant_id = $1
        AND station_id = $2
        AND DATE(recorded_at) = $3
        AND status = 'posted'
    `, [tenantId, stationId, date]);

    await client.query('COMMIT');

    // Return updated summary
    return {
      ...summary,
      isReconciled: true,
      reconciledBy: userId,
      reconciledAt: new Date(),
      notes
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * IMPROVED: Get reconciliation analytics for reports
 * This function provides data for analytics and reports integration
 */
export async function getReconciliationAnalytics(
  db: Pool,
  tenantId: string,
  startDate?: string,
  endDate?: string,
  stationId?: string
): Promise<{
  totalReconciliations: number;
  finalizedReconciliations: number;
  averageDifference: number;
  largestDifference: number;
  reconciliationRate: number;
  stationBreakdown: Array<{
    stationId: string;
    stationName: string;
    reconciliations: number;
    averageDifference: number;
  }>;
}> {
  let query = `
    SELECT
      dr.station_id,
      s.name as station_name,
      dr.finalized,
      ABS(dr.variance) as difference
    FROM day_reconciliations dr
    JOIN stations s ON dr.station_id = s.id
    WHERE dr.tenant_id = $1
  `;

  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (startDate) {
    query += ` AND dr.date >= $${paramIndex++}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND dr.date <= $${paramIndex++}`;
    params.push(endDate);
  }

  if (stationId) {
    query += ` AND dr.station_id = $${paramIndex++}`;
    params.push(stationId);
  }

  const result = await db.query(query, params);
  const records = result.rows;

  const analytics = {
    totalReconciliations: records.length,
    finalizedReconciliations: records.filter(r => r.finalized).length,
    averageDifference: 0,
    largestDifference: 0,
    reconciliationRate: 0,
    stationBreakdown: [] as any[]
  };

  if (records.length > 0) {
    const differences = records.map(r => Number(r.difference || 0));
    analytics.averageDifference = differences.reduce((a, b) => a + b, 0) / differences.length;
    analytics.largestDifference = Math.max(...differences);
    analytics.reconciliationRate = (analytics.finalizedReconciliations / analytics.totalReconciliations) * 100;

    // Station breakdown
    const stationMap = new Map();
    records.forEach(record => {
      const key = record.station_id;
      if (!stationMap.has(key)) {
        stationMap.set(key, {
          stationId: record.station_id,
          stationName: record.station_name,
          reconciliations: 0,
          totalDifference: 0
        });
      }
      const station = stationMap.get(key);
      station.reconciliations++;
      station.totalDifference += Number(record.difference || 0);
    });

    analytics.stationBreakdown = Array.from(stationMap.values()).map(station => ({
      ...station,
      averageDifference: station.totalDifference / station.reconciliations
    }));
  }

  return analytics;
}
