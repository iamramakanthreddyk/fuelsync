import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { parseRows, parseRow } from '../utils/parseDb';

export interface DailyClosureData {
  stationId: string;
  closureDate: string; // YYYY-MM-DD format
  reportedCashAmount: number;
  varianceReason?: string;
}

export interface DailyClosureSummary {
  id: string;
  stationId: string;
  stationName: string;
  closureDate: string;
  systemSalesAmount: number;
  systemSalesVolume: number;
  systemTransactionCount: number;
  reportedCashAmount: number;
  varianceAmount: number;
  varianceReason?: string;
  isClosed: boolean;
  closedBy?: string;
  closedAt?: string;
}

// Get daily summary using existing reconciliation system
export async function getDailySummary(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: string
): Promise<DailyClosureSummary> {
  // Use existing reconciliation service
  const { getOrCreateDailyReconciliation } = await import('./reconciliation.service');
  const reconciliation = await getOrCreateDailyReconciliation(db, tenantId, stationId, new Date(date));
  
  // Get station name
  const stationResult = await db.query('SELECT name FROM stations WHERE id = $1', [stationId]);
  const stationName = stationResult.rows[0]?.name || 'Unknown Station';
  
  // Get closer name if closed
  let closedByName = null;
  if (reconciliation.closed_by) {
    const userResult = await db.query('SELECT name FROM users WHERE id = $1', [reconciliation.closed_by]);
    closedByName = userResult.rows[0]?.name;
  }

  return {
    id: reconciliation.id,
    stationId: reconciliation.station_id,
    stationName,
    closureDate: reconciliation.date.toISOString().split('T')[0],
    systemSalesAmount: Number(reconciliation.total_sales || 0),
    systemSalesVolume: 0, // Not tracked in reconciliation
    systemTransactionCount: 0, // Not tracked in reconciliation
    reportedCashAmount: Number(reconciliation.reported_cash_amount || 0),
    varianceAmount: Number(reconciliation.variance_amount || 0),
    varianceReason: reconciliation.variance_reason,
    isClosed: reconciliation.finalized,
    closedBy: closedByName,
    closedAt: reconciliation.closed_at ? new Date(reconciliation.closed_at).toISOString() : undefined
  };
}

// Calculate system totals for a date with timezone handling
async function calculateSystemTotals(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: string
) {
  // Validate date format and not future
  const targetDate = new Date(date);
  const today = new Date();
  if (targetDate > today) {
    throw new Error(`Cannot calculate totals for future date: ${date}`);
  }

  const result = await db.query(`
    SELECT 
      COALESCE(SUM(s.amount), 0) as total_amount,
      COALESCE(SUM(s.volume), 0) as total_volume,
      COUNT(CASE WHEN s.amount > 0 THEN s.id END) as transaction_count
    FROM sales s
    JOIN nozzles n ON s.nozzle_id = n.id
    JOIN pumps p ON n.pump_id = p.id
    WHERE s.tenant_id = $1 
    AND p.station_id = $2 
    AND DATE(s.recorded_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = $3
    AND s.status != 'voided'
  `, [tenantId, stationId, date]);

  const row = result.rows[0];
  return {
    totalAmount: Number(row.total_amount) || 0,
    totalVolume: Number(row.total_volume) || 0,
    transactionCount: Number(row.transaction_count) || 0
  };
}

// Close a business day with comprehensive validation
// Enhanced reconciliation with cash closure
export async function enhanceReconciliationWithCash(
  db: Pool,
  tenantId: string,
  stationId: string,
  date: string,
  reportedCashAmount: number,
  varianceReason: string,
  userId: string
): Promise<string> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Get or create reconciliation
    const { getOrCreateDailyReconciliation } = await import('./reconciliation.service');
    const reconciliation = await getOrCreateDailyReconciliation(client, tenantId, stationId, new Date(date));
    
    if (reconciliation.finalized) {
      throw new Error(`Business day already finalized for ${date}`);
    }

    // Calculate variance
    const systemSales = Number(reconciliation.total_sales || 0);
    const varianceAmount = reportedCashAmount - systemSales;
    
    // Require explanation for significant variance (> ₹1)
    if (Math.abs(varianceAmount) > 1.00 && (!varianceReason || varianceReason.trim() === '')) {
      throw new Error(`Variance explanation required for difference of ₹${varianceAmount.toFixed(2)}`);
    }

    // Update reconciliation with cash data
    await client.query(`
      UPDATE public.day_reconciliations SET
        reported_cash_amount = $1,
        variance_amount = $2,
        variance_reason = $3,
        finalized = TRUE,
        closed_by = $4,
        closed_at = NOW(),
        updated_at = NOW()
      WHERE id = $5
    `, [
      reportedCashAmount,
      varianceAmount,
      varianceReason,
      userId,
      reconciliation.id
    ]);

    await client.query('COMMIT');
    return reconciliation.id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get open days using existing reconciliation system
export async function getOpenDays(
  db: Pool,
  tenantId: string,
  stationId?: string
): Promise<DailyClosureSummary[]> {
  let query = `
    SELECT dr.*, s.name as station_name, u.name as closed_by_name
    FROM day_reconciliations dr
    LEFT JOIN stations s ON dr.station_id = s.id
    LEFT JOIN users u ON dr.closed_by = u.id
    WHERE dr.tenant_id = $1 AND dr.finalized = FALSE
  `;
  const params = [tenantId];

  if (stationId) {
    query += ' AND dr.station_id = $2';
    params.push(stationId);
  }

  query += ' ORDER BY dr.date DESC, s.name';

  const result = await db.query(query, params);
  return result.rows.map(row => ({
    id: row.id,
    stationId: row.station_id,
    stationName: row.station_name,
    closureDate: row.date.toISOString().split('T')[0],
    systemSalesAmount: Number(row.total_sales || 0),
    systemSalesVolume: 0,
    systemTransactionCount: 0,
    reportedCashAmount: Number(row.reported_cash_amount || 0),
    varianceAmount: Number(row.variance_amount || 0),
    varianceReason: row.variance_reason,
    isClosed: row.finalized,
    closedBy: row.closed_by_name,
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : undefined
  }));
}

// Check if a day is closed using existing reconciliation system
export async function isDayClosed(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: string
): Promise<boolean> {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }

  // Use existing reconciliation service
  const { isFinalized } = await import('./reconciliation.service');
  return await isFinalized(db, tenantId, stationId, new Date(date));
}

// Get closure validation status
export async function validateClosureAttempt(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: string,
  cashAmount: number
): Promise<{ valid: boolean; warnings: string[]; errors: string[] }> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check if already closed
  const isClosed = await isDayClosed(db, tenantId, stationId, date);
  if (isClosed) {
    errors.push('Business day is already closed');
  }

  // Validate cash amount
  if (cashAmount < 0) {
    errors.push('Cash amount cannot be negative');
  }

  // Check for future date
  const targetDate = new Date(date);
  const today = new Date();
  if (targetDate > today) {
    errors.push('Cannot close future business day');
  }

  // Get system totals
  try {
    const summary = await getDailySummary(db, tenantId, stationId, date);
    
    // Warn if no sales but cash reported
    if (summary.systemSalesAmount === 0 && cashAmount > 0) {
      warnings.push('No system sales recorded but cash amount entered');
    }
    
    // Warn if large variance
    const variance = cashAmount - summary.systemSalesAmount;
    if (Math.abs(variance) > summary.systemSalesAmount * 0.1) { // 10% variance
      warnings.push(`Large variance detected: ₹${variance.toFixed(2)}`);
    }
  } catch (error) {
    errors.push('Unable to calculate system totals');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}