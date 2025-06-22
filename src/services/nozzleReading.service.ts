import { Pool } from 'pg';
import { getPriceAtTimestamp } from '../utils/priceUtils';
import { NozzleReadingInput, ReadingQuery } from '../validators/nozzleReading.validator';
import { getCreditorById, incrementCreditorBalance } from './creditor.service';
import { isDayFinalized } from './reconciliation.service';

export async function createNozzleReading(
  db: Pool,
  tenantId: string,
  data: NozzleReadingInput,
  userId: string
): Promise<string> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const lastRes = await client.query<{ reading: number }>(
      `SELECT reading FROM ${tenantId}.nozzle_readings WHERE nozzle_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [data.nozzleId]
    );
    const lastReading = lastRes.rows[0]?.reading ?? 0;
    if (data.reading < Number(lastReading)) {
      throw new Error('Reading must be >= last reading');
    }

    const nozzleInfo = await client.query<{ fuel_type: string; station_id: string }>(
      `SELECT n.fuel_type, p.station_id FROM ${tenantId}.nozzles n JOIN ${tenantId}.pumps p ON n.pump_id = p.id WHERE n.id = $1`,
      [data.nozzleId]
    );
    if (!nozzleInfo.rowCount) {
      throw new Error('Invalid nozzle');
    }
    const { fuel_type, station_id } = nozzleInfo.rows[0];

    const finalized = await isDayFinalized(client, tenantId, station_id, new Date(data.recordedAt));
    if (finalized) {
      throw new Error('Day already finalized for this station');
    }

    const readingRes = await client.query<{ id: string }>(
      `INSERT INTO ${tenantId}.nozzle_readings (nozzle_id, reading, recorded_at) VALUES ($1,$2,$3) RETURNING id`,
      [data.nozzleId, data.reading, data.recordedAt]
    );
    const volumeSold = parseFloat((data.reading - Number(lastReading)).toFixed(2));
    const price = await getPriceAtTimestamp(client, tenantId, station_id, fuel_type, data.recordedAt);
    const saleAmount = price ? parseFloat((volumeSold * price).toFixed(2)) : 0;
    if (data.creditorId) {
      const creditor = await getCreditorById(client, tenantId, data.creditorId);
      if (!creditor) {
        throw new Error('Invalid creditor');
      }
      if (saleAmount > Number(creditor.credit_limit) - Number(creditor.balance)) {
        throw new Error('Credit limit exceeded');
      }
      await incrementCreditorBalance(client, tenantId, data.creditorId, saleAmount);
    }
    await client.query(
      `INSERT INTO ${tenantId}.sales (nozzle_id, user_id, volume_sold, sale_amount, sold_at, payment_method, creditor_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [data.nozzleId, userId, volumeSold, saleAmount, data.recordedAt, data.creditorId ? 'credit' : 'cash', data.creditorId || null]
    );
    await client.query('COMMIT');
    return readingRes.rows[0].id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listNozzleReadings(
  db: Pool,
  tenantId: string,
  query: ReadingQuery
) {
  const params: any[] = [];
  let idx = 1;
  const conditions: string[] = [];
  if (query.nozzleId) {
    conditions.push(`nr.nozzle_id = $${idx++}`);
    params.push(query.nozzleId);
  }
  if (query.stationId) {
    conditions.push(`p.station_id = $${idx++}`);
    params.push(query.stationId);
  }
  if (query.from) {
    conditions.push(`nr.recorded_at >= $${idx++}`);
    params.push(query.from);
  }
  if (query.to) {
    conditions.push(`nr.recorded_at <= $${idx++}`);
    params.push(query.to);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT nr.id, nr.nozzle_id, nr.reading, nr.recorded_at
    FROM ${tenantId}.nozzle_readings nr
    JOIN ${tenantId}.nozzles n ON nr.nozzle_id = n.id
    JOIN ${tenantId}.pumps p ON n.pump_id = p.id
    ${where}
    ORDER BY nr.recorded_at DESC`;
  const res = await db.query(sql, params);
  return res.rows;
}
