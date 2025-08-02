/**
 * @file services/cashReport.service.ts
 * @description Service for cash report operations
 */
import { Pool } from 'pg';

export interface CashReport {
  id: string;
  attendantId: string;
  attendantName: string;
  shiftStart: string;
  shiftEnd: string;
  totalCash: number;
  totalCard: number;
  totalCredit: number;
  totalSales: number;
  variance: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
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
      WHERE cr.tenant_id = $1
    `;

    const params: any[] = [tenantId];

    // If user is an attendant, only show their own reports
    if (userRole === 'attendant' && userId) {
      query += ' AND cr.attendant_id = $2';
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
  attendantId: string,
  reportData: {
    shiftStart: string;
    shiftEnd: string;
    totalCash: number;
    totalCard: number;
    totalCredit: number;
    totalSales: number;
    variance: number;
  }
): Promise<CashReport> {
  try {
    const query = `
      INSERT INTO cash_reports (
        tenant_id,
        attendant_id,
        shift_start,
        shift_end,
        total_cash,
        total_card,
        total_credit,
        total_sales,
        variance,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW(), NOW())
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

    const params = [
      tenantId,
      attendantId,
      reportData.shiftStart,
      reportData.shiftEnd,
      reportData.totalCash,
      reportData.totalCard,
      reportData.totalCredit,
      reportData.totalSales,
      reportData.variance,
    ];

    const result = await db.query(query, params);
    const report = result.rows[0];

    // Get attendant name
    const attendantQuery = 'SELECT name FROM users WHERE id = $1';
    const attendantResult = await db.query(attendantQuery, [attendantId]);
    report.attendantName = attendantResult.rows[0]?.name || 'Unknown';

    return report;
  } catch (error) {
    console.error('Error creating cash report:', error);
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
