import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { getPriceAtTimestamp } from '../utils/priceUtils';
import { NozzleReadingInput, ReadingQuery } from '../validators/nozzleReading.validator';
import { getCreditorById, incrementCreditorBalance } from './creditor.service';
import { isDayFinalized } from './reconciliation.service';
import { parseRows } from '../utils/parseDb';

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
      'SELECT reading FROM public.nozzle_readings WHERE nozzle_id = $1 AND tenant_id = $2 ORDER BY recorded_at DESC LIMIT 1',
      [data.nozzleId, tenantId]
    );
    const lastReading = lastRes.rows[0]?.reading ?? 0;
    if (data.reading < Number(lastReading)) {
      throw new Error('Reading must be >= last reading');
    }

    const nozzleInfo = await client.query<{ fuel_type: string; station_id: string }>(
      'SELECT n.fuel_type, p.station_id FROM public.nozzles n JOIN public.pumps p ON n.pump_id = p.id WHERE n.id = $1 AND n.tenant_id = $2',
      [data.nozzleId, tenantId]
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
      'INSERT INTO public.nozzle_readings (id, tenant_id, nozzle_id, reading, recorded_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id',
      [randomUUID(), tenantId, data.nozzleId, data.reading, data.recordedAt]
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
      'INSERT INTO public.sales (id, tenant_id, nozzle_id, station_id, volume, fuel_type, fuel_price, amount, payment_method, creditor_id, created_by, recorded_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())',
      [
        randomUUID(),
        tenantId,
        data.nozzleId,
        station_id,
        volumeSold,
        fuel_type,
        price || 0,
        saleAmount,
        data.paymentMethod || (data.creditorId ? 'credit' : 'cash'),
        data.creditorId || null,
        userId,
        data.recordedAt,
      ]
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
  const params: any[] = [tenantId];
  let idx = 2;
  const conditions: string[] = ['nr.tenant_id = $1'];
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
  const where = `WHERE ${conditions.join(' AND ')}`;
  const sql = `SELECT nr.id, nr.nozzle_id, nr.reading, nr.recorded_at
    FROM public.nozzle_readings nr
    JOIN public.nozzles n ON nr.nozzle_id = n.id
    JOIN public.pumps p ON n.pump_id = p.id
    ${where}
    ORDER BY nr.recorded_at DESC`;
  const res = await db.query(sql, params);
  return parseRows(res.rows);
}
