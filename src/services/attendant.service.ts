import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { parseRows } from '../utils/parseDb';

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
    `SELECT p.id, p.label, p.station_id
       FROM public.pumps p
       JOIN public.user_stations us ON us.station_id = p.station_id
      WHERE us.user_id = $1 AND p.tenant_id = $2 AND p.station_id = $3
      ORDER BY p.label`,
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

export async function createCashReport(
  db: Pool,
  tenantId: string,
  userId: string,
  stationId: string,
  date: Date,
  cashAmount: number,
  creditAmount: number
) {
  const res = await db.query<{ id: string }>(
    `INSERT INTO public.cash_reports (id, tenant_id, station_id, user_id, date, cash_amount, credit_amount, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING id`,
    [randomUUID(), tenantId, stationId, userId, date, cashAmount, creditAmount]
  );
  return res.rows[0].id;
}

export async function listCashReports(db: Pool, tenantId: string, userId: string) {
  const res = await db.query(
    `SELECT cr.id, cr.station_id, s.name AS station_name, cr.date, cr.cash_amount, cr.credit_amount
       FROM public.cash_reports cr
       JOIN public.stations s ON cr.station_id = s.id
      WHERE cr.tenant_id = $1 AND cr.user_id = $2
      ORDER BY cr.date DESC
      LIMIT 30`,
    [tenantId, userId]
  );
  return parseRows(res.rows);
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
      FROM ${tenantId}.alerts a
      LEFT JOIN ${tenantId}.stations st ON a.station_id = st.id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT 50`;
  const res = await db.query(query, params);
  return parseRows(res.rows);
}

export async function acknowledgeAlert(db: Pool, tenantId: string, alertId: string): Promise<boolean> {
  const res = await db.query(
    `UPDATE ${tenantId}.alerts SET is_read = TRUE WHERE id = $1 RETURNING id`,
    [alertId]
  );
  return (res.rowCount ?? 0) > 0;
}
