/**
 * @file services/cashReport.service.ts
 * @description Service for cash report operations
 */
import { Pool } from 'pg';

export interface CashReport {
  id: string;
  tenantId: string;
  stationId: string;
  stationName?: string;
  userId: string;
  userName?: string;
  date: string;
  shift: 'morning' | 'afternoon' | 'night';
  cashAmount: number;
  cardAmount: number;
  upiAmount: number;
  creditAmount: number;
  totalAmount: number;
  notes?: string;
  status: 'submitted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CashReportSummary {
  totalCash: number;
  totalCard: number;
  totalUpi: number;
  totalCredit: number;
  totalAmount: number;
  reportCount: number;
}

/**
 * List cash reports for a tenant
 */
export async function listCashReports(
  db: Pool,
  tenantId: string,
  userId?: string,
  userRole?: string
): Promise<CashReport[]> {
  try {
    let query = `
      SELECT 
        cr.id,
        cr.tenant_id as "tenantId",
        cr.station_id as "stationId",
        s.name as "stationName",
        cr.user_id as "userId",
        u.name as "userName",
        cr.date,
        cr.shift,
        cr.cash_collected as "cashAmount",
        cr.card_amount as "cardAmount",
        cr.upi_amount as "upiAmount",
        cr.credit_amount as "creditAmount",
        cr.total_amount as "totalAmount",
        cr.notes,
        cr.status,
        cr.created_at as "createdAt",
        cr.updated_at as "updatedAt"
      FROM cash_reports cr
      LEFT JOIN users u ON cr.user_id = u.id
      LEFT JOIN stations s ON cr.station_id = s.id
      WHERE cr.tenant_id = $1
    `;

    const params: any[] = [tenantId];

    // If user is an attendant, only show their own reports
    if (userRole === 'attendant' && userId) {
      query += ' AND cr.user_id = $2';
      params.push(userId);
    }

    query += ' ORDER BY cr.created_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error listing cash reports:', error);
    throw new Error('Failed to fetch cash reports');
  }
}

/**
 * Get a specific cash report
 */
export async function getCashReport(
  db: Pool,
  tenantId: string,
  reportId: string,
  userId?: string,
  userRole?: string
): Promise<CashReport | null> {
  try {
    let query = `
      SELECT 
        cr.id,
        cr.attendant_id as "attendantId",
        u.name as "attendantName",
        cr.shift_start as "shiftStart",
        cr.shift_end as "shiftEnd",
        cr.total_cash as "totalCash",
        cr.total_card as "totalCard",
        cr.total_credit as "totalCredit",
        cr.total_sales as "totalSales",
        cr.variance,
        cr.status,
        cr.created_at as "createdAt",
        cr.updated_at as "updatedAt"
      FROM cash_reports cr
      LEFT JOIN users u ON cr.attendant_id = u.id
      WHERE cr.tenant_id = $1 AND cr.id = $2
    `;

    const params: any[] = [tenantId, reportId];

    // If user is an attendant, only show their own reports
    if (userRole === 'attendant' && userId) {
      query += ' AND cr.attendant_id = $3';
      params.push(userId);
    }

    const result = await db.query(query, params);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting cash report:', error);
    throw new Error('Failed to fetch cash report');
  }
}

/**
 * Create a new cash report
 */
export async function createCashReport(
  db: Pool,
  tenantId: string,
  stationId: string,
  userId: string,
  reportData: {
    date: string;
    shift: 'morning' | 'afternoon' | 'night';
    cashAmount: number;
    cardAmount: number;
    upiAmount: number;
    creditAmount: number;
    creditorId?: string;
    notes?: string;
  }
): Promise<CashReport> {
  const totalAmount =
    reportData.cashAmount +
    reportData.cardAmount +
    reportData.upiAmount +
    reportData.creditAmount;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
      
      const query = `
        INSERT INTO cash_reports (
          tenant_id,
          station_id,
          user_id,
          date,
          shift,
          cash_amount,
          card_amount,
          upi_amount,
          credit_amount,
          creditor_id,
          total_amount,
          notes,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'submitted', NOW(), NOW())
        ON CONFLICT (tenant_id, station_id, user_id, date, shift)
        DO UPDATE SET
          cash_amount = EXCLUDED.cash_amount,
          card_amount = EXCLUDED.card_amount,
          upi_amount = EXCLUDED.upi_amount,
          credit_amount = EXCLUDED.credit_amount,
          creditor_id = EXCLUDED.creditor_id,
          total_amount = EXCLUDED.total_amount,
          notes = EXCLUDED.notes,
          updated_at = NOW()
      RETURNING 
        id,
        tenant_id as "tenantId",
        station_id as "stationId",
        user_id as "userId",
        date,
        shift,
        cash_amount as "cashAmount",
        card_amount as "cardAmount",
        upi_amount as "upiAmount",
        credit_amount as "creditAmount",
        total_amount as "totalAmount",
        notes,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

      const params = [
        tenantId,
        stationId,
        userId,
        reportData.date,
        reportData.shift,
        reportData.cashAmount,
        reportData.cardAmount,
        reportData.upiAmount,
        reportData.creditAmount,
        reportData.creditorId || null,
        totalAmount,
        reportData.notes
      ];

      const result = await client.query(query, params);
      
      // If credit was given to a creditor, create a sales record
      if (reportData.creditAmount > 0 && reportData.creditorId) {
        const { randomUUID } = require('crypto');
        await client.query(`
          INSERT INTO sales (
            id, tenant_id, station_id, nozzle_id, volume, fuel_type, fuel_price, 
            amount, payment_method, creditor_id, recorded_at, status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, 
            (SELECT n.id FROM nozzles n JOIN pumps p ON n.pump_id = p.id WHERE p.station_id = $3 AND p.tenant_id = $2 LIMIT 1),
            0, 'petrol', 0, $4, 'credit', $5, $6::date, 'posted', NOW(), NOW()
          )
        `, [randomUUID(), tenantId, stationId, reportData.creditAmount, reportData.creditorId, reportData.date]);
      }
      
      await client.query('COMMIT');
    const report = result.rows[0];

    // Get user and station names
    const userQuery = 'SELECT name FROM users WHERE id = $1';
    const stationQuery = 'SELECT name FROM stations WHERE id = $1';
    
    const [userResult, stationResult] = await Promise.all([
      db.query(userQuery, [userId]),
      db.query(stationQuery, [stationId])
    ]);
    
    report.userName = userResult.rows[0]?.name || 'Unknown';
    report.stationName = stationResult.rows[0]?.name || 'Unknown';

      return report;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating cash report:', error);
      throw new Error('Failed to create cash report');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in createCashReport:', error);
    throw new Error('Failed to create cash report');
  }
}

/**
 * Update cash report status
 */
export async function updateCashReportStatus(
  db: Pool,
  tenantId: string,
  reportId: string,
  status: 'approved' | 'rejected'
): Promise<CashReport | null> {
  try {
    const query = `
      UPDATE cash_reports 
      SET status = $1, updated_at = NOW()
      WHERE tenant_id = $2 AND id = $3
      RETURNING 
        id,
        attendant_id as "attendantId",
        shift_start as "shiftStart",
        shift_end as "shiftEnd",
        total_cash as "totalCash",
        total_card as "totalCard",
        total_credit as "totalCredit",
        total_sales as "totalSales",
        variance,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await db.query(query, [status, tenantId, reportId]);
    const report = result.rows[0];

    if (report) {
      // Get attendant name
      const attendantQuery = 'SELECT name FROM users WHERE id = $1';
      const attendantResult = await db.query(attendantQuery, [report.attendantId]);
      report.attendantName = attendantResult.rows[0]?.name || 'Unknown';
    }

    return report || null;
  } catch (error) {
    console.error('Error updating cash report status:', error);
    throw new Error('Failed to update cash report status');
  }
}

/**
 * Get cash report summary for a specific date and station
 */
export async function getCashReportSummary(
  db: Pool,
  tenantId: string,
  stationId: string,
  date: string
): Promise<CashReportSummary> {
  try {
    const query = `
      SELECT 
        COALESCE(SUM(cash_amount), 0) as total_cash,
        COALESCE(SUM(card_amount), 0) as total_card,
        COALESCE(SUM(upi_amount), 0) as total_upi,
        COALESCE(SUM(credit_amount), 0) as total_credit,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COUNT(*) as report_count
      FROM cash_reports
      WHERE tenant_id = $1 AND station_id = $2 AND date = $3
    `;

    const result = await db.query(query, [tenantId, stationId, date]);
    const row = result.rows[0];

    return {
      totalCash: Number(row.total_cash || 0),
      totalCard: Number(row.total_card || 0),
      totalUpi: Number(row.total_upi || 0),
      totalCredit: Number(row.total_credit || 0),
      totalAmount: Number(row.total_amount || 0),
      reportCount: Number(row.report_count || 0)
    };
  } catch (error) {
    console.error('Error getting cash report summary:', error);
    throw new Error('Failed to get cash report summary');
  }
}

/**
 * Delete a cash report
 */
export async function deleteCashReport(
  db: Pool,
  tenantId: string,
  reportId: string
): Promise<boolean> {
  try {
    const query = 'DELETE FROM cash_reports WHERE tenant_id = $1 AND id = $2';
    const result = await db.query(query, [tenantId, reportId]);
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Error deleting cash report:', error);
    throw new Error('Failed to delete cash report');
  }
}
