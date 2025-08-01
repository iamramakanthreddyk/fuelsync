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
  let client;
  try {
    // Set a timeout for acquiring a client from the pool
    const connectPromise = db.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout: Failed to acquire client from pool')), 5000);
    });
    
    // Race between connection and timeout
    client = await Promise.race([connectPromise, timeoutPromise]);
    console.log('[NOZZLE-READING] Successfully acquired database client');
    
    // Start transaction
    await client.query('BEGIN');
    // Get the last reading for this nozzle
    const lastRes = await client.query<{ reading: number; recorded_at: Date }>(
      'SELECT reading, recorded_at FROM public.nozzle_readings WHERE nozzle_id = $1 AND tenant_id = $2 AND status != $3 ORDER BY recorded_at DESC LIMIT 1',
      [data.nozzleId, tenantId, 'voided']
    );
    console.log(`[NOZZLE-READING] Last reading query returned ${lastRes.rowCount ?? 0} rows`);
    
    // Default to 0 if no previous reading
    const lastReading = lastRes.rows[0]?.reading ?? 0;
    
    // Log the last reading for debugging
    console.log(`[NOZZLE-READING] Last reading: ${lastReading}, New reading: ${data.reading}, Has rows: ${lastRes.rowCount ?? 0}`);
    
    // Only check for duplicates if there is a previous reading
    if ((lastRes.rowCount ?? 0) > 0 && Math.abs(data.reading - Number(lastReading)) < 0.001) {
      console.log(`[NOZZLE-READING] Duplicate reading detected: ${data.reading} vs last reading: ${lastReading}`);
      throw new Error('Reading must be different from the last reading. Duplicate readings are not allowed.');
    }
    
    // Check if reading is less than last reading (meter reset) - only if there is a previous reading
    // Add a small tolerance (0.001) to handle floating point precision issues
    if ((lastRes.rowCount ?? 0) > 0 && data.reading < (Number(lastReading) - 0.001)) {
      console.log(`[NOZZLE-READING] Meter reset detected: ${data.reading} < ${lastReading}`);
      
      // Get user role to check if they can do meter resets
      const userRole = await db.query('SELECT role FROM public.users WHERE id = $1', [userId]);
      const role = userRole.rows[0]?.role;
      console.log(`[NOZZLE-READING] User role for meter reset: ${role}`);
      
      // Only managers and owners can do meter resets
      if (role !== 'manager' && role !== 'owner') {
        throw new Error('Reading must be greater than the last reading. Only managers and owners can reset meters.');
      }
    }
    
    // Check for backdated readings (only allow if user is manager or owner) - only if there is a previous reading
    const lastReadingDate = lastRes.rows[0]?.recorded_at;
    if ((lastRes.rowCount ?? 0) > 0 && lastReadingDate && new Date(data.recordedAt) < new Date(lastReadingDate)) {
      console.log(`[NOZZLE-READING] Backdated reading detected: ${new Date(data.recordedAt).toISOString()} < ${new Date(lastReadingDate).toISOString()}`);
      
      // Get user role
      const userRole = await db.query('SELECT role FROM public.users WHERE id = $1', [userId]);
      const role = userRole.rows[0]?.role;
      console.log(`[NOZZLE-READING] User role for backdated reading: ${role}`);
      
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

    // Generate a new UUID for the reading
    const readingId = randomUUID();
    console.log(`[NOZZLE-READING] Creating new reading with ID: ${readingId}`);
    
    // Insert the reading into the database
    const readingRes = await client.query<{ id: string }>(
      'INSERT INTO public.nozzle_readings (id, tenant_id, nozzle_id, reading, recorded_at, payment_method, creditor_id, status, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING id',
      [
        readingId,
        tenantId,
        data.nozzleId,
        data.reading,
        data.recordedAt,
        data.paymentMethod || (data.creditorId ? 'credit' : 'cash'),
        data.creditorId || null,
        'active'
      ]
    );
    
    console.log(`[NOZZLE-READING] Reading created successfully: ${readingRes.rows[0]?.id}`);
    // Calculate volume sold
    let volumeSold;
    if ((lastRes.rowCount ?? 0) > 0 && data.reading < (Number(lastReading) - 0.001)) {
      // This is a meter reset - use the new reading as the volume
      volumeSold = parseFloat(data.reading.toFixed(3));
      console.log(`[NOZZLE-READING] Meter reset volume calculation: ${volumeSold}`);
    } else {
      // Normal case - subtract last reading
      volumeSold = parseFloat((data.reading - (lastReading || 0)).toFixed(3));
      console.log(`[NOZZLE-READING] Normal volume calculation: ${data.reading} - ${lastReading} = ${volumeSold}`);
    }
    
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
      const newBalance = saleAmount; // Balance tracking removed
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
    if (client) {
      await client.query('ROLLBACK');
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function listNozzleReadings(
  tenantId: string,
  query: ReadingQuery
) {
  // Check if tenantId is a string
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new Error('Invalid tenant ID');
  }
  
  const params: any[] = [tenantId];
  let idx = 2;
  const filters: string[] = [];
  
  // Handle nozzleId parameter
  if (query.nozzleId && typeof query.nozzleId === 'string' && query.nozzleId.trim() !== '') {
    console.log(`[NOZZLE-READING] Adding nozzleId filter: ${query.nozzleId}`);
    filters.push(`nr.nozzle_id = $${idx++}`);
    params.push(query.nozzleId.trim());
  }
  
  // Handle stationId parameter
  if (query.stationId && typeof query.stationId === 'string' && query.stationId.trim() !== '') {
    console.log(`[NOZZLE-READING] Adding stationId filter: ${query.stationId}`);
    filters.push(`s.id = $${idx++}`);
    params.push(query.stationId.trim());
  }
  
  // Handle date filters
  if (query.from) {
    filters.push(`nr.recorded_at >= $${idx++}`);
    params.push(query.from);
  }
  if (query.to) {
    filters.push(`nr.recorded_at <= $${idx++}`);
    params.push(query.to);
  }
  
  const filterClause = filters.length ? ' AND ' + filters.join(' AND ') : '';
  const limitClause = query.limit ? ` LIMIT ${parseInt(String(query.limit), 10)}` : '';
  
  // Log the query for debugging
  console.log('[NOZZLE-READING] Query filters:', { filters, params });
  
  // Simplified query to avoid window functions which might cause issues
  const sql = `
    SELECT
      nr.id,
      nr.nozzle_id AS "nozzleId",
      COALESCE(n.nozzle_number, 0) AS "nozzleNumber",
      COALESCE(n.fuel_type, 'unknown') AS "fuelType",
      p.id AS "pumpId",
      COALESCE(p.name, 'Unknown Pump') AS "pumpName",
      s.id AS "stationId",
      COALESCE(s.name, 'Unknown Station') AS "stationName",
      nr.reading,
      nr.recorded_at AS "recordedAt",
      COALESCE(nr.payment_method, 'cash') AS "paymentMethod",
      COALESCE(u.name, 'System') AS "attendantName",
      COALESCE(sa.fuel_price, 0) AS "pricePerLitre"
    FROM public.nozzle_readings nr
    LEFT JOIN public.nozzles n ON nr.nozzle_id = n.id
    LEFT JOIN public.pumps p ON n.pump_id = p.id
    LEFT JOIN public.stations s ON p.station_id = s.id
    LEFT JOIN public.sales sa ON sa.reading_id = nr.id
    LEFT JOIN public.users u ON sa.created_by = u.id
    WHERE nr.tenant_id = $1${filterClause}
    ORDER BY nr.recorded_at DESC${limitClause}
  `;
  
  try {
    console.log('[NOZZLE-READING] Executing SQL:', sql);
    console.log('[NOZZLE-READING] With params:', params);
    
    // First try with Prisma
    try {
      const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as any[];
      console.log(`[NOZZLE-READING] Query returned ${rows.length} rows`);
      
      // Process each row to add calculated fields
      const processedRows = await Promise.all(rows.map(async (row: any) => {
        try {
          // Skip previous reading lookup if nozzleId is missing
          if (!row.nozzleId) {
            return row;
          }
          
          const prevRes = await prisma.$queryRaw`
            SELECT reading FROM public.nozzle_readings 
            WHERE nozzle_id = ${row.nozzleId} AND tenant_id = ${params[0]} AND recorded_at < ${row.recordedAt} 
            ORDER BY recorded_at DESC LIMIT 1
          `;
          
          const prevReadings = prevRes as any[];
          if (prevReadings && prevReadings.length > 0) {
            row.previousReading = prevReadings[0].reading;
            row.volume = row.reading - row.previousReading;
          } else {
            row.previousReading = 0;
            row.volume = row.reading;
          }
          
          // Calculate amount if price is available
          if (row.pricePerLitre) {
            row.amount = row.volume * row.pricePerLitre;
          }
          
          return row;
        } catch (error) {
          console.error(`[NOZZLE-READING] Error processing row ${row.id}:`, error);
          return row;
        }
      }));
      
      return processedRows;
    } catch (prismaError) {
      console.error('[NOZZLE-READING] Prisma query error:', prismaError);
      
      // Fallback to using the existing pool from db.ts
      const dbPool = require('../utils/db').default;
      try {
        const result = await dbPool.query(sql, params);
        console.log(`[NOZZLE-READING] Fallback query returned ${result.rows.length} rows`);
        
        // Process each row to add calculated fields
        const processedRows = await Promise.all(result.rows.map(async (row: any) => {
          try {
            // Skip previous reading lookup if nozzleId is missing
            if (!row.nozzleId) {
              return row;
            }
            
            const prevRes = await dbPool.query(
              `SELECT reading FROM public.nozzle_readings 
               WHERE nozzle_id = $1 AND tenant_id = $2 AND recorded_at < $3 
               ORDER BY recorded_at DESC LIMIT 1`,
              [row.nozzleId, params[0], row.recordedAt]
            );
            
            if (prevRes.rows.length > 0) {
              row.previousReading = prevRes.rows[0].reading;
              row.volume = row.reading - row.previousReading;
            } else {
              row.previousReading = 0;
              row.volume = row.reading;
            }
            
            // Calculate amount if price is available
            if (row.pricePerLitre) {
              row.amount = row.volume * row.pricePerLitre;
            }
            
            return row;
          } catch (error) {
            console.error(`[NOZZLE-READING] Error processing row ${row.id}:`, error);
            return row;
          }
        }));
        
        return processedRows;
      } catch (pgError) {
        console.error('[NOZZLE-READING] PG query error:', pgError);
        throw pgError;
      }
    }
  } catch (error) {
    console.error('[NOZZLE-READING] Error executing query:', error);
    // Return empty array instead of throwing to prevent API errors
    return [];
  }
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
  // Simplified query to avoid window functions
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
       sa.fuel_price AS "pricePerLitre"
     FROM public.nozzle_readings nr
     JOIN public.nozzles n ON nr.nozzle_id = n.id
     JOIN public.pumps p ON n.pump_id = p.id
     JOIN public.stations s ON p.station_id = s.id
     LEFT JOIN public.sales sa ON sa.reading_id = nr.id
     LEFT JOIN public.users u ON sa.created_by = u.id
     WHERE nr.id = $1 AND nr.tenant_id = $2`,
    [id, tenantId]
  );
  
  // If we found a reading, get the previous reading separately
  if (res.rows[0]) {
    try {
      const reading = res.rows[0];
      const prevRes = await db.query(
        `SELECT reading FROM public.nozzle_readings 
         WHERE nozzle_id = $1 AND tenant_id = $2 AND recorded_at < $3 
         ORDER BY recorded_at DESC LIMIT 1`,
        [reading.nozzleId, tenantId, reading.recordedAt]
      );
      
      if (prevRes.rows[0]) {
        reading.previousReading = prevRes.rows[0].reading;
        reading.volume = reading.reading - reading.previousReading;
        if (reading.pricePerLitre) {
          reading.amount = reading.volume * reading.pricePerLitre;
        }
      } else {
        reading.previousReading = 0;
        reading.volume = reading.reading;
        if (reading.pricePerLitre) {
          reading.amount = reading.volume * reading.pricePerLitre;
        }
      }
      
      return reading;
    } catch (error) {
      console.error('[NOZZLE-READING] Error getting previous reading:', error);
      return res.rows[0];
    }
  }
  
  return null;
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

/**
 * Void a nozzle reading (mark as invalid)
 * This creates an audit trail and marks the reading as voided
 */
export async function voidNozzleReading(
  db: Pool,
  tenantId: string,
  id: string,
  reason: string,
  userId: string
) {
  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    
    // First, check if the reading exists
    const readingRes = await client.query<{ id: string, nozzle_id: string, reading: number, recorded_at: Date }>(
      'SELECT id, nozzle_id, reading, recorded_at FROM public.nozzle_readings WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    if (!readingRes.rowCount) {
      throw new Error('Reading not found');
    }
    
    const reading = readingRes.rows[0];
    
    // Check if there are any sales records associated with this reading
    const salesRes = await client.query<{ id: string }>(
      'SELECT id FROM public.sales WHERE reading_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    // Check if user exists (since we don't have foreign key constraints)
    const userRes = await client.query<{ id: string }>(
      'SELECT id FROM public.users WHERE id = $1',
      [userId]
    );
    
    if (!userRes.rowCount || userRes.rowCount === 0) {
      throw new Error('Invalid user');
    }
    
    // Create an audit record with UUID generation
    await client.query(
      `INSERT INTO public.reading_audit_log (
        id, tenant_id, reading_id, action, reason, performed_by, created_at
      ) VALUES (gen_random_uuid(), $1, $2, 'void', $3, $4, NOW())`,
      [tenantId, id, reason, userId]
    );
    
    // Mark the reading as voided
    await client.query(
      'UPDATE public.nozzle_readings SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
      ['voided', id, tenantId]
    );
    
    // If there are sales records, mark them as voided too
    if (salesRes.rowCount && salesRes.rowCount > 0) {
      await client.query(
        'UPDATE public.sales SET status = $1, updated_at = NOW() WHERE reading_id = $2 AND tenant_id = $3',
        ['voided', id, tenantId]
      );
    }
    
    await client.query('COMMIT');
    return { id, status: 'voided' };
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}