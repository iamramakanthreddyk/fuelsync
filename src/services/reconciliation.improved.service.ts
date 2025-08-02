/**
 * @file services/reconciliation.improved.service.ts
 * @description Simplified and intuitive reconciliation service
 */
import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';

// Clear, simple interfaces
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
    percentageDifference: number; // (totalDifference / systemCalculated.totalRevenue) * 100
    isWithinTolerance: boolean;   // Whether difference is within acceptable range (±2%)
  };

  // Enhanced Status
  isReconciled: boolean;
  reconciledBy?: string;
  reconciledAt?: Date;
  notes?: string;

  // Validation and Alerts
  validationIssues: ValidationIssue[];
  recommendedActions: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ValidationIssue {
  type: 'warning' | 'error' | 'info';
  message: string;
  field?: string;
  suggestedAction?: string;
}

// Business rules and tolerances
export const RECONCILIATION_TOLERANCES = {
  ACCEPTABLE_PERCENTAGE: 2.0, // ±2% is acceptable
  WARNING_PERCENTAGE: 1.0,    // ±1% shows warning
  LARGE_AMOUNT_THRESHOLD: 10000, // Amounts over ₹10,000 need extra scrutiny
  ZERO_SALES_WARNING: true,   // Warn if no sales recorded
};

/**
 * Get system calculated sales for a date
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
 * Get user entered cash for a date
 */
export async function getUserEnteredCash(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: string
): Promise<UserEnteredCash> {
  const query = `
    SELECT 
      COALESCE(SUM(cash_amount), 0) as cash_collected,
      COALESCE(SUM(card_amount), 0) as card_collected,
      COALESCE(SUM(upi_amount), 0) as upi_collected
    FROM cash_reports
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
 * Generate reconciliation summary - the main function
 */
export async function generateReconciliationSummary(
  db: Pool,
  tenantId: string,
  stationId: string,
  date: string
): Promise<ReconciliationSummary> {
  // Get station name
  const stationResult = await db.query(
    'SELECT name FROM stations WHERE id = $1 AND tenant_id = $2',
    [stationId, tenantId]
  );
  const stationName = stationResult.rows[0]?.name || 'Unknown Station';
  
  // Get system calculated sales
  const systemCalculated = await getSystemCalculatedSales(db, tenantId, stationId, date);
  
  // Get user entered cash
  const userEntered = await getUserEnteredCash(db, tenantId, stationId, date);
  
  // Calculate enhanced differences
  const cashDifference = userEntered.cashCollected - systemCalculated.cashSales;
  const cardDifference = userEntered.cardCollected - systemCalculated.cardSales;
  const upiDifference = userEntered.upiCollected - systemCalculated.upiSales;
  const totalDifference = userEntered.totalCollected - (systemCalculated.totalRevenue - systemCalculated.creditSales);

  // Calculate percentage difference
  const percentageDifference = systemCalculated.totalRevenue > 0
    ? (totalDifference / systemCalculated.totalRevenue) * 100
    : 0;

  // Check if within tolerance
  const isWithinTolerance = Math.abs(percentageDifference) <= RECONCILIATION_TOLERANCES.ACCEPTABLE_PERCENTAGE;

  // Check if reconciled
  const reconciliationResult = await db.query(
    'SELECT finalized, closed_by, closed_at, notes FROM day_reconciliations WHERE tenant_id = $1 AND station_id = $2 AND date = $3',
    [tenantId, stationId, date]
  );

  const isReconciled = reconciliationResult.rows[0]?.finalized || false;
  const reconciledBy = reconciliationResult.rows[0]?.closed_by;
  const reconciledAt = reconciliationResult.rows[0]?.closed_at;
  const notes = reconciliationResult.rows[0]?.notes;

  // Create initial summary
  const summary: ReconciliationSummary = {
    date,
    stationId,
    stationName,
    systemCalculated,
    userEntered,
    differences: {
      cashDifference,
      cardDifference,
      upiDifference,
      totalDifference,
      percentageDifference,
      isWithinTolerance
    },
    isReconciled,
    reconciledBy,
    reconciledAt,
    notes,
    validationIssues: [],
    recommendedActions: [],
    riskLevel: 'low'
  };

  // Add validation and recommendations
  summary.validationIssues = validateReconciliationData(summary);
  summary.recommendedActions = generateRecommendedActions(summary);
  summary.riskLevel = calculateRiskLevel(summary);

  return summary;
}

/**
 * Close the day - simple finalization
 */
export async function closeDayReconciliation(
  db: Pool,
  tenantId: string,
  stationId: string,
  date: string,
  userId: string,
  notes?: string
): Promise<void> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Get the reconciliation summary
    const summary = await generateReconciliationSummary(db, tenantId, stationId, date);
    
    // Insert or update day_reconciliations
    await client.query(`
      INSERT INTO day_reconciliations (
        id, tenant_id, station_id, date, 
        total_sales, cash_total, card_total, upi_total, credit_total,
        finalized, closed_by, closed_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, NOW(), NOW()
      )
      ON CONFLICT (tenant_id, station_id, date) 
      DO UPDATE SET
        total_sales = EXCLUDED.total_sales,
        cash_total = EXCLUDED.cash_total,
        card_total = EXCLUDED.card_total,
        upi_total = EXCLUDED.upi_total,
        credit_total = EXCLUDED.credit_total,
        finalized = true,
        closed_by = EXCLUDED.closed_by,
        closed_at = NOW(),
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
      userId
    ]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Enhanced validation for reconciliation data
 */
export function validateReconciliationData(summary: ReconciliationSummary): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { systemCalculated, userEntered, differences } = summary;

  // Check for zero sales
  if (systemCalculated.totalRevenue === 0) {
    issues.push({
      type: 'warning',
      message: 'No sales recorded for this date. Please verify if the station was operational.',
      suggestedAction: 'Check if readings were recorded and station was open for business.'
    });
  }

  // Check for missing cash entries
  if (userEntered.totalCollected === 0 && systemCalculated.totalRevenue > 0) {
    issues.push({
      type: 'error',
      message: 'No cash entries found but system shows sales. Cash collection data is required.',
      field: 'userEntered',
      suggestedAction: 'Enter actual cash, card, and UPI collections for the day.'
    });
  }

  // Check for large discrepancies
  const absPercentageDiff = Math.abs(differences.percentageDifference);
  if (absPercentageDiff > RECONCILIATION_TOLERANCES.ACCEPTABLE_PERCENTAGE) {
    issues.push({
      type: 'error',
      message: `Large discrepancy detected: ${absPercentageDiff.toFixed(1)}% difference (acceptable: ±${RECONCILIATION_TOLERANCES.ACCEPTABLE_PERCENTAGE}%)`,
      suggestedAction: 'Review cash collections and verify all transactions were recorded correctly.'
    });
  } else if (absPercentageDiff > RECONCILIATION_TOLERANCES.WARNING_PERCENTAGE) {
    issues.push({
      type: 'warning',
      message: `Moderate discrepancy: ${absPercentageDiff.toFixed(1)}% difference`,
      suggestedAction: 'Double-check cash counts and card/UPI settlements.'
    });
  }

  return issues;
}

/**
 * Generate recommended actions based on reconciliation data
 */
export function generateRecommendedActions(summary: ReconciliationSummary): string[] {
  const actions: string[] = [];
  const { differences, systemCalculated } = summary;

  // If within tolerance, provide positive feedback
  if (differences.isWithinTolerance) {
    actions.push('✅ Reconciliation looks good! Differences are within acceptable range.');
  }

  // Specific recommendations based on differences
  if (differences.cashDifference !== 0) {
    const action = differences.cashDifference > 0
      ? 'Cash collected exceeds system calculation - verify if all cash sales were recorded'
      : 'Cash shortage detected - recount cash and check for missing transactions';
    actions.push(action);
  }

  if (differences.cardDifference !== 0) {
    actions.push('Card payment difference detected - verify card terminal settlements');
  }

  if (differences.upiDifference !== 0) {
    actions.push('UPI payment difference detected - check UPI app settlements and QR code transactions');
  }

  // General recommendations
  if (Math.abs(differences.totalDifference) > 100) {
    actions.push('Review all transactions for the day to identify discrepancies');
  }

  if (systemCalculated.totalRevenue > 50000) {
    actions.push('High sales day - consider additional verification steps');
  }

  return actions;
}

/**
 * Determine risk level based on reconciliation data
 */
export function calculateRiskLevel(summary: ReconciliationSummary): 'low' | 'medium' | 'high' {
  const { differences, validationIssues } = summary;

  // High risk conditions
  const hasErrors = validationIssues.some(issue => issue.type === 'error');
  const largePercentageDiff = Math.abs(differences.percentageDifference) > RECONCILIATION_TOLERANCES.ACCEPTABLE_PERCENTAGE;

  if (hasErrors || largePercentageDiff) {
    return 'high';
  }

  // Medium risk conditions
  const hasWarnings = validationIssues.some(issue => issue.type === 'warning');
  const moderatePercentageDiff = Math.abs(differences.percentageDifference) > RECONCILIATION_TOLERANCES.WARNING_PERCENTAGE;

  if (hasWarnings || moderatePercentageDiff) {
    return 'medium';
  }

  return 'low';
}
