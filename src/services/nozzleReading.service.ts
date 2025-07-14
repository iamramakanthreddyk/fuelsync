import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { getPriceAtTimestamp } from '../utils/priceUtils';
import { createAlert } from './alert.service';
import { NozzleReadingInput, ReadingQuery } from '../validators/nozzleReading.validator';
import { getCreditorById, incrementCreditorBalance } from './creditor.service';
import { isDayFinalized } from './reconciliation.service';
import { toStandardDate, toStandardDateTime } from '../utils/dateUtils';
import prisma from '../utils/prisma';

export async function createNozzleReading(
  db: Pool,
  tenantId: string,
  data: NozzleReadingInput,
  userId: string
): Promise<string> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const lastRes = await client.query<{ reading: number; recorded_at: Date }>(
      'SELECT reading, recorded_at FROM public.nozzle_readings WHERE nozzle_id = $1 AND tenant_id = $2 ORDER BY recorded_at DESC LIMIT 1',
      [data.nozzleId, tenantId]
    );
    const lastReading = lastRes.rows[0]?.reading ?? 0;
    if (data.reading < Number(lastReading)) {
      throw new Error('Reading must be >= last reading');
    }
    
    // Prevent duplicate readings (same value entered again)
    if (data.reading === Number(lastReading)) {
      throw new Error('Reading must be greater than the last reading. Duplicate readings are not allowed.');
    }
    
    // Check for backdated readings (only allow if user is manager or owner)
    const lastReadingDate = lastRes.rows[0]?.recorded_at;
    if (lastReadingDate && new Date(data.recordedAt) < new Date(lastReadingDate)) {
      // Get user role
      const userRole = await db.query('SELECT role FROM public.users WHERE id = $1', [userId]);
      const role = userRole.rows[0]?.role;
      
      if (role !== 'manager' && role !== 'owner') {
        throw new Error('Backdated readings can only be entered by managers or owners.');
      }
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

    const readingId = randomUUID();
    const readingRes = await client.query<{ id: string }>(
      'INSERT INTO public.nozzle_readings (id, tenant_id, nozzle_id, reading, recorded_at, payment_method, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id',
      [
        readingId,
        tenantId,
        data.nozzleId,
        data.reading,
        data.recordedAt,
        data.paymentMethod || (data.creditorId ? 'credit' : 'cash'),
      ]
    );
    const volumeSold = parseFloat((data.reading - Number(lastReading)).toFixed(3));
    
    // Use standardized date handling
    const dateOnly = toStandardDate(data.recordedAt);
    console.log(`[NOZZLE-READING] Looking for price using date: ${dateOnly} for fuel type: ${fuel_type}`);
    
    const priceRecord = await getPriceAtTimestamp(
      prisma,
      tenantId,
      station_id,
      fuel_type,
      data.recordedAt
    );
    
    if (!priceRecord) {
      // Try to find any price for this fuel type to provide better error message
      const anyPrice = await prisma.fuelPrice.findFirst({
        where: {
          tenant_id: tenantId,
          station_id: station_id,
          fuel_type: fuel_type
        }
      });
      
      if (anyPrice) {
        throw new Error(`Fuel price for ${fuel_type} exists but is not valid for ${dateOnly}. The price is valid from ${anyPrice.valid_from.toISOString().split('T')[0]}.`);
      } else {
        throw new Error(`Fuel price not found for ${fuel_type} at this station. Please set fuel prices before recording readings.`);
      }
    }
    const { price } = priceRecord;
    const saleAmount = parseFloat((volumeSold * price).toFixed(2));
    if (data.creditorId) {
      const creditor = await getCreditorById(client, tenantId, data.creditorId);
      if (!creditor) {
        throw new Error('Invalid creditor');
      }
      const newBalance = Number(creditor.balance) + saleAmount;
      if (newBalance > Number(creditor.credit_limit)) {
        throw new Error('Credit limit exceeded');
      }
      if (newBalance >= Number(creditor.credit_limit) * 0.9) {
        await createAlert(
          tenantId,
          station_id,
          'credit_near_limit',
          'Creditor above 90% of credit limit',
          'warning'
        );
      }
      await incrementCreditorBalance(client, tenantId, data.creditorId, saleAmount);
    }
    await client.query(
      'INSERT INTO public.sales (id, tenant_id, nozzle_id, reading_id, station_id, volume, fuel_type, fuel_price, amount, payment_method, creditor_id, created_by, recorded_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())',
      [
        randomUUID(),
        tenantId,
        data.nozzleId,
        readingId,
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
  tenantId: string,
  query: ReadingQuery
) {
  const params: any[] = [tenantId];
  let idx = 2;
  const filters: string[] = [];
  if (query.nozzleId) {
    filters.push(`o.nozzle_id = $${idx++}`);
    params.push(query.nozzleId);
  }
  if (query.stationId) {
    filters.push(`o.station_id = $${idx++}`);
    params.push(query.stationId);
  }
  if (query.from) {
    filters.push(`o.recorded_at >= $${idx++}`);
    params.push(query.from);
  }
  if (query.to) {
    filters.push(`o.recorded_at <= $${idx++}`);
    params.push(query.to);
  }
  const filterClause = filters.length
    ? ' AND ' + filters.join(' AND ').replace(/o\./g, 'nr.')
    : '';
  const limitClause = query.limit ? ` LIMIT ${parseInt(String(query.limit), 10)}` : '';
  const sql = `
    SELECT
      nr.id,
      nr.nozzle_id AS "nozzleId",
      COALESCE(n.nozzle_number, 0) AS "nozzleNumber",
      COALESCE(n.fuel_type, 'unknown') AS "fuelType",
      COALESCE(p.id, '') AS "pumpId",
      COALESCE(p.name, 'Unknown Pump') AS "pumpName",
      COALESCE(s.id, '') AS "stationId",
      COALESCE(s.name, 'Unknown Station') AS "stationName",
      nr.reading,
      nr.recorded_at AS "recordedAt",
      COALESCE(nr.payment_method, 'cash') AS "paymentMethod",
      LAG(nr.reading) OVER (PARTITION BY nr.nozzle_id ORDER BY nr.recorded_at) AS "previousReading",
      COALESCE(u.name, 'System') AS "attendantName",
      (nr.reading - LAG(nr.reading) OVER (PARTITION BY nr.nozzle_id ORDER BY nr.recorded_at)) AS "volume",
      COALESCE(sa.fuel_price, 0) AS "pricePerLitre",
      (nr.reading - LAG(nr.reading) OVER (PARTITION BY nr.nozzle_id ORDER BY nr.recorded_at)) * COALESCE(sa.fuel_price, 0) AS "amount"
    FROM public.nozzle_readings nr
    LEFT JOIN public.nozzles n ON nr.nozzle_id = n.id
    LEFT JOIN public.pumps p ON n.pump_id = p.id
    LEFT JOIN public.stations s ON p.station_id = s.id
    LEFT JOIN public.sales sa ON sa.reading_id = nr.id
    LEFT JOIN public.users u ON sa.created_by = u.id
    WHERE nr.tenant_id = $1${filterClause}
    ORDER BY nr.recorded_at DESC${limitClause}
  `;
  const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as any[];
  return rows;
}

export async function canCreateNozzleReading(
  db: Pool,
  tenantId: string,
  nozzleId: string
) {
  const nozzleRes = await db.query<{ status: string; fuel_type: string; station_id: string }>(
    `SELECT n.status, n.fuel_type, p.station_id
       FROM public.nozzles n
       JOIN public.pumps p ON n.pump_id = p.id
      WHERE n.id = $1 AND n.tenant_id = $2`,
    [nozzleId, tenantId]
  );

  if (!nozzleRes.rowCount) {
    return { allowed: false, reason: 'Invalid nozzle' } as const;
  }

  const { status, fuel_type, station_id } = nozzleRes.rows[0];

  if (status !== 'active') {
    return { allowed: false, reason: 'Nozzle inactive' } as const;
  }

  // Check for fuel price - fuel prices are per station, not per fuel type
  console.log(`[NOZZLE-READING] Checking for fuel prices with params:`, {
    stationId: station_id,
    fuelType: fuel_type,
    tenantId
  });
  
  // First, check for any prices regardless of date to see if they exist
  const allPricesRes = await db.query<{ id: string, price: number, valid_from: Date, effective_to: Date | null }>(
    `SELECT id, price, valid_from, effective_to FROM public.fuel_prices
       WHERE station_id = $1 AND fuel_type = $2
         AND tenant_id = $3`,
    [station_id, fuel_type, tenantId]
  );
  
  console.log(`[NOZZLE-READING] Found ${allPricesRes.rowCount} total prices for this station/fuel:`, 
    allPricesRes.rows.map(r => ({
      id: r.id,
      price: r.price,
      validFrom: r.valid_from,
      effectiveTo: r.effective_to
    })));
  
  // Now check for active prices (valid now)
  // Use standardized date handling
  const today = toStandardDate(new Date());
  const priceRes = await db.query<{ id: string }>(
    `SELECT id FROM public.fuel_prices
       WHERE station_id = $1 AND fuel_type = $2
         AND tenant_id = $3
         AND DATE(valid_from) <= DATE(NOW())
         AND (effective_to IS NULL OR DATE(effective_to) > DATE(NOW()))
       LIMIT 1`,
    [station_id, fuel_type, tenantId]
  );
  
  console.log(`[NOZZLE-READING] Using today's date for comparison: ${today}`);
  
  console.log(`[NOZZLE-READING] Price check for station ${station_id}, fuel ${fuel_type}, tenant ${tenantId}: ${priceRes.rowCount} rows`);

  if (!priceRes.rowCount) {
    console.log(`[NOZZLE-READING] No active price found for station ${station_id}, fuel type ${fuel_type}`);
    
    // Check if there are prices but they're not active yet (future dated)
    if (allPricesRes.rowCount && allPricesRes.rowCount > 0) {
      const futurePrices = allPricesRes.rows.filter(r => new Date(r.valid_from) > new Date());
      if (futurePrices.length > 0) {
        console.log(`[NOZZLE-READING] Found ${futurePrices.length} future prices. Earliest valid from:`, 
          futurePrices.sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime())[0].valid_from);
        return { allowed: false, reason: 'Fuel price exists but is not yet active', missingPrice: true } as const;
      }
    }
    
    return { allowed: false, reason: 'Active price missing', missingPrice: true } as const;
  }

  return { allowed: true } as const;
}

export async function getNozzleReading(db: Pool, tenantId: string, id: string) {
  const res = await db.query(
    `SELECT
       nr.id,
       nr.nozzle_id AS "nozzleId",
       n.nozzle_number AS "nozzleNumber",
       p.id AS "pumpId",
       p.name AS "pumpName",
       s.id AS "stationId",
       s.name AS "stationName",
       nr.reading,
       nr.recorded_at AS "recordedAt",
       nr.payment_method AS "paymentMethod",
       nr.creditor_id,
       n.fuel_type AS "fuelType",
       u.name AS "attendantName",
       LAG(nr.reading) OVER (PARTITION BY nr.nozzle_id ORDER BY nr.recorded_at) AS "previousReading",
       (nr.reading - LAG(nr.reading) OVER (PARTITION BY nr.nozzle_id ORDER BY nr.recorded_at)) AS "volume",
       sa.fuel_price AS "pricePerLitre",
       (nr.reading - LAG(nr.reading) OVER (PARTITION BY nr.nozzle_id ORDER BY nr.recorded_at)) * sa.fuel_price AS "amount"
     FROM public.nozzle_readings nr
     JOIN public.nozzles n ON nr.nozzle_id = n.id
     JOIN public.pumps p ON n.pump_id = p.id
     JOIN public.stations s ON p.station_id = s.id
     LEFT JOIN public.sales sa ON sa.reading_id = nr.id
     LEFT JOIN public.users u ON sa.created_by = u.id
     WHERE nr.id = $1 AND nr.tenant_id = $2`,
    [id, tenantId]
  );
  return res.rows[0] || null;
}

export async function updateNozzleReading(
  db: Pool,
  tenantId: string,
  id: string,
  data: Partial<NozzleReadingInput>
) {
  const fields: string[] = [];
  const values: any[] = [id, tenantId];
  let idx = 3;
  if (data.reading !== undefined) {
    fields.push(`reading = $${idx++}`);
    values.push(data.reading);
  }
  if (data.recordedAt !== undefined) {
    fields.push(`recorded_at = $${idx++}`);
    values.push(data.recordedAt);
  }
  if (data.paymentMethod) {
    fields.push(`payment_method = $${idx++}`);
    values.push(data.paymentMethod);
  }
  if (data.creditorId !== undefined) {
    fields.push(`creditor_id = $${idx++}`);
    values.push(data.creditorId);
  }
  if (fields.length === 0) {
    return null;
  }
  const sql = `UPDATE public.nozzle_readings SET ${fields.join(", ")}, updated_at = NOW()
               WHERE id = $1 AND tenant_id = $2 RETURNING id`;
  const res = await db.query<{ id: string }>(sql, values);
  return res.rowCount ? res.rows[0].id : null;
}
