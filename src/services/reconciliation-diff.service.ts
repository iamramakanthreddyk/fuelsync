import { Pool } from 'pg';
import { parseRows } from '../utils/parseDb';

export interface ReconciliationDiff {
  id: string;
  stationId: string;
  stationName?: string;
  date: string;
  reportedCash: number;
  actualCash: number;
  difference: number;
  status: 'match' | 'over' | 'short';
  cashReportId?: string;
  reconciliationId?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getReconciliationDiffs(
  db: Pool,
  tenantId: string,
  stationId?: string,
  startDate?: Date,
  endDate?: Date,
  status?: 'match' | 'over' | 'short'
): Promise<ReconciliationDiff[]> {
  const params: any[] = [tenantId];
  const conditions: string[] = [];
  let idx = 2;

  if (stationId) {
    conditions.push(`rd.station_id = $${idx++}`);
    params.push(stationId);
  }

  if (startDate) {
    conditions.push(`rd.date >= $${idx++}`);
    params.push(startDate);
  }

  if (endDate) {
    conditions.push(`rd.date <= $${idx++}`);
    params.push(endDate);
  }

  if (status) {
    conditions.push(`rd.status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT rd.id, rd.station_id, s.name AS station_name, rd.date, 
           rd.reported_cash, rd.actual_cash, rd.difference, rd.status,
           rd.cash_report_id, rd.reconciliation_id, rd.created_at, rd.updated_at
    FROM public.reconciliation_diff rd
    JOIN public.stations s ON rd.station_id = s.id
    WHERE rd.tenant_id = $1 ${where}
    ORDER BY rd.date DESC, ABS(rd.difference) DESC
    LIMIT 100
  `;

  const result = await db.query(query, params);
  return parseRows(result.rows);
}

export async function getReconciliationDiffById(
  db: Pool,
  tenantId: string,
  id: string
): Promise<ReconciliationDiff | null> {
  const query = `
    SELECT rd.id, rd.station_id, s.name AS station_name, rd.date, 
           rd.reported_cash, rd.actual_cash, rd.difference, rd.status,
           rd.cash_report_id, rd.reconciliation_id, rd.created_at, rd.updated_at
    FROM public.reconciliation_diff rd
    JOIN public.stations s ON rd.station_id = s.id
    WHERE rd.tenant_id = $1 AND rd.id = $2
  `;

  const result = await db.query(query, [tenantId, id]);
  return result.rows.length ? parseRows(result.rows)[0] : null;
}

export async function getDashboardDiscrepancySummary(
  db: Pool,
  tenantId: string
): Promise<{
  totalDiscrepancies: number;
  totalOverReported: number;
  totalUnderReported: number;
  largestDiscrepancy: number;
  recentDiscrepancies: ReconciliationDiff[];
}> {
  // Get summary counts
  const summaryQuery = `
    SELECT 
      COUNT(*) FILTER (WHERE status != 'match') AS total_discrepancies,
      COUNT(*) FILTER (WHERE status = 'over') AS total_over,
      COUNT(*) FILTER (WHERE status = 'short') AS total_under,
      MAX(ABS(difference)) AS largest_discrepancy
    FROM public.reconciliation_diff
    WHERE tenant_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
  `;
  
  const summaryResult = await db.query(summaryQuery, [tenantId]);
  
  // Get recent discrepancies
  const recentQuery = `
    SELECT rd.id, rd.station_id, s.name AS station_name, rd.date, 
           rd.reported_cash, rd.actual_cash, rd.difference, rd.status,
           rd.cash_report_id, rd.reconciliation_id, rd.created_at, rd.updated_at
    FROM public.reconciliation_diff rd
    JOIN public.stations s ON rd.station_id = s.id
    WHERE rd.tenant_id = $1 AND rd.status != 'match'
    ORDER BY rd.date DESC, ABS(rd.difference) DESC
    LIMIT 5
  `;
  
  const recentResult = await db.query(recentQuery, [tenantId]);
  
  return {
    totalDiscrepancies: parseInt(summaryResult.rows[0]?.total_discrepancies || '0'),
    totalOverReported: parseInt(summaryResult.rows[0]?.total_over || '0'),
    totalUnderReported: parseInt(summaryResult.rows[0]?.total_under || '0'),
    largestDiscrepancy: parseFloat(summaryResult.rows[0]?.largest_discrepancy || '0'),
    recentDiscrepancies: parseRows(recentResult.rows)
  };
}