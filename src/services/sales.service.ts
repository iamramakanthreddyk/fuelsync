import { Pool } from 'pg';
import { SalesQuery } from '../validators/sales.validator';
import { parseRows } from '../utils/parseDb';

export async function listSales(db: Pool, tenantId: string, query: SalesQuery) {
  const params: any[] = [tenantId];
  const conds: string[] = [];
  let idx = 2;
  if (query.nozzleId) {
    conds.push(`s.nozzle_id = $${idx++}`);
    params.push(query.nozzleId);
  }
  if (query.stationId) {
    conds.push(`s.station_id = $${idx++}`);
    params.push(query.stationId);
  }
  if (query.startDate) {
    conds.push(`s.recorded_at >= $${idx++}`);
    params.push(query.startDate);
  }
  if (query.endDate) {
    conds.push(`s.recorded_at <= $${idx++}`);
    // Add end of day to include the entire end date
    const endDate = new Date(query.endDate);
    endDate.setHours(23, 59, 59, 999);
    params.push(endDate);
  }
  const where = conds.length ? `AND ${conds.join(' AND ')}` : '';
  const limit = query.limit || 50;
  const offset = ((query.page || 1) - 1) * limit;
  const sql = `SELECT s.id, s.nozzle_id, s.station_id, s.fuel_type, s.fuel_price,
                      s.volume, s.amount, s.payment_method, s.status, s.recorded_at,
                      p.id AS pump_id, p.name AS pump_name,
                      st.name AS station_name,
                      n.nozzle_number,
                      s.fuel_price AS price_per_liter
               FROM public.sales s
               LEFT JOIN public.nozzles n ON s.nozzle_id = n.id
               LEFT JOIN public.pumps p ON n.pump_id = p.id
               LEFT JOIN public.stations st ON s.station_id = st.id
               WHERE s.tenant_id = $1 ${where}
               ORDER BY s.recorded_at DESC
               LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);
  const res = await db.query(sql, params);
  // Transform the rows to ensure all required fields are present
  const transformedRows = res.rows.map(r => ({
    ...r,
    volume: parseFloat(r.volume),
    amount: parseFloat(r.amount),
    fuel_price: r.fuel_price !== undefined ? parseFloat(r.fuel_price) : undefined,
    // Ensure these fields are explicitly included in the response
    station_name: r.station_name || 'Unknown Station',
    pump_name: r.pump_name || 'Unknown Pump',
    nozzle_number: r.nozzle_number || 'N/A',
    price_per_liter: r.price_per_liter !== undefined ? parseFloat(r.price_per_liter) : (r.fuel_price !== undefined ? parseFloat(r.fuel_price) : 0)
  }));
  
  // Log the first row to verify the fields are present
  if (transformedRows.length > 0) {
    console.log('[SALES-SERVICE] Sample transformed row:', JSON.stringify(transformedRows[0]));
  }
  
  return parseRows(transformedRows);
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
  return parseRows(
    res.rows.map(r => ({ key: r.key, volume: parseFloat(r.volume), amount: parseFloat(r.amount) }))
  );
}
