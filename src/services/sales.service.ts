import { Pool } from 'pg';
import { SalesQuery } from '../validators/sales.validator';

export async function listSales(db: Pool, tenantId: string, query: SalesQuery) {
  const params: any[] = [tenantId];
  const conds: string[] = [];
  let idx = 2;
  if (query.nozzleId) {
    conds.push(`s.nozzle_id = $${idx++}`);
    params.push(query.nozzleId);
  }
  if (query.stationId) {
    conds.push(`p.station_id = $${idx++}`);
    params.push(query.stationId);
  }
  if (query.startDate) {
    conds.push(`s.recorded_at >= $${idx++}`);
    params.push(query.startDate);
  }
  if (query.endDate) {
    conds.push(`s.recorded_at <= $${idx++}`);
    params.push(query.endDate);
  }
  const where = conds.length ? `AND ${conds.join(' AND ')}` : '';
  const limit = query.limit || 50;
  const offset = ((query.page || 1) - 1) * limit;
  const sql = `SELECT s.id, s.nozzle_id, s.created_by as user_id, s.volume, s.amount, s.recorded_at, s.payment_method
               FROM public.sales s
               JOIN public.nozzles n ON s.nozzle_id = n.id
               JOIN public.pumps p ON n.pump_id = p.id
               WHERE s.tenant_id = $1 ${where}
               ORDER BY s.recorded_at DESC
               LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);
  const res = await db.query(sql, params);
  return res.rows;
}

export async function salesAnalytics(db: Pool, tenantId: string, stationId?: string, groupBy: string = 'station') {
  const params: any[] = [tenantId];
  let where = '';
  let idx = 2;
  if (stationId) {
    where = `AND p.station_id = $${idx++}`;
    params.push(stationId);
  }
  const groupColumn = groupBy === 'station' ? 'p.station_id' : 'p.id';
  const sql = `SELECT ${groupColumn} as key, SUM(s.volume) as volume, SUM(s.amount) as amount
               FROM public.sales s
               JOIN public.nozzles n ON s.nozzle_id = n.id
               JOIN public.pumps p ON n.pump_id = p.id
               WHERE s.tenant_id = $1 ${where}
               GROUP BY ${groupColumn}
               ORDER BY amount DESC`;
  const res = await db.query(sql, params);
  return res.rows.map(r => ({ key: r.key, volume: parseFloat(r.volume), amount: parseFloat(r.amount) }));
}
