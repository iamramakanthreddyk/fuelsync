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
  const sql = `SELECT s.id, s.nozzle_id, s.user_id, s.volume_sold, s.sale_amount, s.sold_at, s.payment_method
               FROM ${tenantId}.sales s
               JOIN ${tenantId}.nozzles n ON s.nozzle_id = n.id
               JOIN ${tenantId}.pumps p ON n.pump_id = p.id
               ${where}
               ORDER BY s.sold_at DESC`;
  const res = await db.query(sql, params);
  return res.rows;
}
