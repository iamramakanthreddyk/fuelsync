import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { parseRows } from '../utils/parseDb';
import { getPriceAtTimestamp } from '../utils/priceUtils';
import { incrementCreditorBalance } from './creditor.service';
import { createAlert } from './alert.service';
import prisma from '../utils/prisma';
import { isFinalized } from './reconciliation.service';

export async function listUserStations(db: Pool, tenantId: string, userId: string) {
  const res = await db.query(
    `SELECT s.id, s.name
       FROM public.stations s
       JOIN public.user_stations us ON us.station_id = s.id
      WHERE us.user_id = $1 AND s.tenant_id = $2
      ORDER BY s.name`,
    [userId, tenantId]
  );
  return parseRows(res.rows);
}

export async function listUserPumps(db: Pool, tenantId: string, userId: string, stationId: string) {
  const res = await db.query(
    `SELECT p.id, p.name, p.station_id
       FROM public.pumps p
       JOIN public.user_stations us ON us.station_id = p.station_id
      WHERE us.user_id = $1 AND p.tenant_id = $2 AND p.station_id = $3
      ORDER BY p.name`,
    [userId, tenantId, stationId]
  );
  return parseRows(res.rows);
}

export async function listUserNozzles(db: Pool, tenantId: string, userId: string, pumpId: string) {
  const res = await db.query(
    `SELECT n.id, n.pump_id, n.nozzle_number, n.fuel_type
       FROM public.nozzles n
       JOIN public.pumps p ON n.pump_id = p.id
       JOIN public.user_stations us ON us.station_id = p.station_id
      WHERE us.user_id = $1 AND n.tenant_id = $2 AND n.pump_id = $3
      ORDER BY n.nozzle_number`,
    [userId, tenantId, pumpId]
  );
  return parseRows(res.rows);
}

export async function listUserCreditors(db: Pool, tenantId: string) {
  const res = await db.query(
    `SELECT id, party_name, credit_limit, balance, status
       FROM public.creditors
      WHERE tenant_id = $1
      ORDER BY party_name`,
    [tenantId]
  );
  return parseRows(res.rows);
}

export interface CreditEntry {
  creditorId: string;
  fuelType: string;
  litres?: number;
  amount?: number;
}

export async function createCashReport(
  db: Pool,
  tenantId: string,
  userId: string,
  stationId: string,
  date: Date,
  cashAmount: number,
  cardAmount: number = 0,
  upiAmount: number = 0,
  shift: 'morning' | 'afternoon' | 'night' | null = null,
  creditEntries: CreditEntry[] = []
) {
  console.log('[CASH-REPORT] Creating cash report with params:', {
    tenantId,
    userId,
    stationId,
    date,
    cashAmount,
    cardAmount,
    upiAmount,
    shift
  });
  try {
    console.log('[CASH-REPORT] Connecting to database...');
    const client = await db.connect();
    try {
    await client.query('BEGIN');
    const finalized = await isFinalized(client, tenantId, stationId, date);
    if (finalized) {
      throw new Error('Day already finalized for this station');
    }
    let totalCredit = 0;
    for (const entry of creditEntries) {
      const nozzleRes = await client.query<{ id: string }>(
        `SELECT n.id FROM public.nozzles n
           JOIN public.pumps p ON n.pump_id = p.id
          WHERE p.station_id = $1 AND n.fuel_type = $2 AND n.tenant_id = $3
          LIMIT 1`,
        [stationId, entry.fuelType, tenantId]
      );
      if (!nozzleRes.rowCount) {
        throw new Error('No matching nozzle for fuel type');
      }
      const nozzleId = nozzleRes.rows[0].id;
        console.log('[CASH-REPORT] Getting price for fuel type:', entry.fuelType);
        let priceRec;
        try {
          priceRec = await getPriceAtTimestamp(
            prisma,
            tenantId,
            stationId,
            entry.fuelType,
            date
          );
          console.log('[CASH-REPORT] Price record:', priceRec);
        } catch (priceErr) {
          console.error('[CASH-REPORT] Error getting price:', priceErr);
          priceRec = null;
        }
      const price = priceRec ? priceRec.price : 0;
      const volume = entry.litres ?? (entry.amount ? entry.amount / price : 0);
      const amount = entry.amount ?? volume * price;
      await client.query(
        `INSERT INTO public.sales (id, tenant_id, nozzle_id, station_id, volume, fuel_type, fuel_price, amount, payment_method, creditor_id, created_by, recorded_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'credit',$9,$10,$11,NOW())`,
        [
          randomUUID(),
          tenantId,
          nozzleId,
          stationId,
          volume,
          entry.fuelType,
          price,
          amount,
          entry.creditorId,
          userId,
          date
        ]
      );
      await incrementCreditorBalance(client, tenantId, entry.creditorId, amount);
      totalCredit += amount;
    }
    const cashReportId = randomUUID();
    const res = await client.query<{ id: string }>(
      `INSERT INTO public.cash_reports (id, tenant_id, station_id, user_id, date, cash_amount, card_amount, upi_amount, credit_amount, shift, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING id`,
      [cashReportId, tenantId, stationId, userId, date, cashAmount, cardAmount, upiAmount, totalCredit, shift]
    );
    
    // Calculate actual cash from sales for reconciliation
    const salesRes = await client.query<{ cash_total: number }>(
      `SELECT COALESCE(SUM(CASE WHEN payment_method='cash' THEN amount ELSE 0 END), 0) as cash_total
       FROM public.sales
       WHERE station_id = $1 AND DATE(recorded_at) = $2 AND tenant_id = $3`,
      [stationId, date, tenantId]
    );
    
    const actualCash = Number(salesRes.rows[0]?.cash_total ?? 0);
    const difference = cashAmount - actualCash;
    const status = difference === 0 ? 'match' : (difference > 0 ? 'over' : 'short');
    
    // Create reconciliation diff record (if table exists)
    try {
      await client.query(
        `INSERT INTO public.reconciliation_diff (id, tenant_id, station_id, date, reported_cash, actual_cash, difference, status, cash_report_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [randomUUID(), tenantId, stationId, date, cashAmount, actualCash, difference, status, cashReportId]
      );
    } catch (diffErr) {
      console.warn('[CASH-REPORT] Could not create reconciliation diff record:', diffErr);
      // Continue without failing the entire transaction
    }
    
    // Create alert if difference exceeds threshold (e.g., 5% of actual cash or 1000, whichever is less)
    try {
      const threshold = Math.min(actualCash * 0.05, 1000);
      if (Math.abs(difference) > threshold) {
        await createAlert(
          tenantId,
          stationId,
          'cash_discrepancy',
          `Cash discrepancy detected: ${difference > 0 ? 'Over-reported' : 'Under-reported'} by ${Math.abs(difference).toFixed(2)}`,
          'warning'
        );
      }
    } catch (alertErr) {
      console.warn('[CASH-REPORT] Could not create alert:', alertErr);
      // Continue without failing the entire transaction
    }
    await client.query('COMMIT');
    return res.rows[0].id;
  } catch (err) {
    console.error('[CASH-REPORT] Transaction error:', err);
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  } catch (err) {
    console.error('[CASH-REPORT] Database connection error:', err);
    throw err;
  }
}

export async function listCashReports(db: Pool, tenantId: string, userId: string, userRole?: string) {
  try {
    // First check if cash_reports table exists
    const tableCheck = await db.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'cash_reports'
       )`
    );
    
    if (!tableCheck.rows[0]?.exists) {
      console.log('[CASH-REPORTS] cash_reports table does not exist');
      return [];
    }
    
    // Owners and Managers can see all cash reports in their tenant
    // Attendants can only see their own cash reports
    const whereClause = (userRole === 'owner' || userRole === 'manager') 
      ? 'WHERE cr.tenant_id = $1'
      : 'WHERE cr.tenant_id = $1 AND cr.user_id = $2';
    
    const params = (userRole === 'owner' || userRole === 'manager') 
      ? [tenantId] 
      : [tenantId, userId];
    
    const res = await db.query(
      `SELECT cr.id, cr.station_id, s.name AS station_name, cr.date, cr.cash_amount, 
              COALESCE(cr.credit_amount, 0) as credit_amount,
              COALESCE(cr.card_amount, 0) as card_amount,
              COALESCE(cr.upi_amount, 0) as upi_amount,
              u.name as created_by_name
         FROM public.cash_reports cr
         JOIN public.stations s ON cr.station_id = s.id
         LEFT JOIN public.users u ON cr.user_id = u.id
        ${whereClause}
        ORDER BY cr.date DESC
        LIMIT 30`,
      params
    );
    return parseRows(res.rows);
  } catch (err) {
    console.error('[CASH-REPORTS] Error listing cash reports:', err);
    // Return empty array if table doesn't exist or has issues
    return [];
  }
}

export async function listAlerts(db: Pool, tenantId: string, stationId?: string, unreadOnly: boolean = false) {
  const conditions = [] as string[];
  const params: any[] = [];
  let idx = 1;

  if (stationId) {
    conditions.push(`a.station_id = $${idx++}`);
    params.push(stationId);
  }
  if (unreadOnly) {
    conditions.push('a.is_read = false');
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT a.id, a.station_id, st.name AS station_name, a.alert_type, a.message, a.severity, a.is_read, a.created_at
      FROM public.alerts a
      LEFT JOIN public.stations st ON a.station_id = st.id
      WHERE a.tenant_id = $${idx++} ${conditions.length ? 'AND ' + conditions.join(' AND ') : ''}
      ORDER BY a.created_at DESC
      LIMIT 50`;
  params.unshift(tenantId);
  const res = await db.query(query, params);
  return parseRows(res.rows);
}

export async function acknowledgeAlert(db: Pool, tenantId: string, alertId: string): Promise<boolean> {
  const res = await db.query(
    `UPDATE public.alerts SET is_read = TRUE WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [alertId, tenantId]
  );
  return (res.rowCount ?? 0) > 0;
}
