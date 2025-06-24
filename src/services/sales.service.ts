import { Pool } from 'pg';
import { SalesQuery } from '../validators/sales.validator';

export async function listSales(db: Pool, tenantId: string, query: SalesQuery) {
  const params: any[] = [];
  const conds: string[] = [];
  let idx = 1;
  if (query.nozzleId) {
    conds.push(`s.nozzle_id = $${idx++}`);
    params.push(query.nozzleId);
  }
  if (query.stationId) {
    conds.push(`p.station_id = $${idx++}`);
    params.push(query.stationId);
  }
  if (query.startDate) {
    conds.push(`s.sold_at >= $${idx++}`);
    params.push(query.startDate);
  }
  if (query.endDate) {
    conds.push(`s.sold_at <= $${idx++}`);
    params.push(query.endDate);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const limit = query.limit || 50;
  const offset = ((query.page || 1) - 1) * limit;
  const sql = `SELECT s.id, s.nozzle_id, s.user_id, s.volume_sold, s.sale_amount, s.sold_at, s.payment_method
               FROM ${tenantId}.sales s
               JOIN ${tenantId}.nozzles n ON s.nozzle_id = n.id
               JOIN ${tenantId}.pumps p ON n.pump_id = p.id
               ${where}
               ORDER BY s.sold_at DESC
               LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);
  const res = await db.query(sql, params);
  return res.rows;
}

export async function salesAnalytics(db: Pool, tenantId: string, stationId?: string, groupBy: string = 'station') {
  const params: any[] = [];
  let where = '';
  if (stationId) {
    where = 'WHERE p.station_id = $1';
    params.push(stationId);
  }
  const groupColumn = groupBy === 'station' ? 'p.station_id' : 'p.id';
  const sql = `SELECT ${groupColumn} as key, SUM(s.volume_sold) as volume, SUM(s.sale_amount) as amount
               FROM ${tenantId}.sales s
               JOIN ${tenantId}.nozzles n ON s.nozzle_id = n.id
               JOIN ${tenantId}.pumps p ON n.pump_id = p.id
               ${where}
               GROUP BY ${groupColumn}
               ORDER BY amount DESC`;
  const res = await db.query(sql, params);
  return res.rows.map(r => ({ key: r.key, volume: parseFloat(r.volume), amount: parseFloat(r.amount) }));
}
