import { PrismaClient } from '@prisma/client';
import { toStandardDate, toStandardDateTime } from './dateUtils';

export interface PriceRecord {
  price: number;
  validFrom: Date;
}

export async function getPriceAtTimestamp(
  prisma: PrismaClient,
  tenantId: string,
  stationId: string,
  fuelType: string,
  timestamp: Date | string
): Promise<PriceRecord | null> {
  // Standardize the date to end of day for comparison
  const standardDate = toStandardDateTime(timestamp, false);
  const dateOnly = toStandardDate(timestamp);
  
  console.log(`[PRICE-UTILS] Looking for price with params:`, {
    tenantId,
    stationId,
    fuelType,
    date: dateOnly
  });
  
  // Find price valid on this date
  const record = await prisma.fuelPrice.findFirst({
    where: {
      tenant_id: tenantId,
      station_id: stationId,
      fuel_type: fuelType,
      valid_from: { lte: standardDate },
    },
    orderBy: { valid_from: 'desc' },
  });
  
  if (record) {
    console.log(`[PRICE-UTILS] Found price record:`, {
      id: record.id,
      price: record.price,
      validFrom: record.valid_from
    });
    return { price: Number(record.price), validFrom: record.valid_from };
  }
  
  // If no record found, log all available prices for debugging
  console.log(`[PRICE-UTILS] No price found, checking all available prices for this station and fuel type`);
  const allPrices = await prisma.fuelPrice.findMany({
    where: {
      tenant_id: tenantId,
      station_id: stationId,
    },
    orderBy: { valid_from: 'desc' },
  });
  
  console.log(`[PRICE-UTILS] Available prices:`, allPrices.map(p => ({
    id: p.id,
    fuelType: p.fuel_type,
    price: p.price,
    validFrom: p.valid_from,
    effectiveTo: p.effective_to
  })));
  
  // As a fallback, try to find any price for this fuel type regardless of date
  const fallbackRecord = await prisma.fuelPrice.findFirst({
    where: {
      tenant_id: tenantId,
      station_id: stationId,
      fuel_type: fuelType,
    },
    orderBy: { valid_from: 'desc' },
  });
  
  if (fallbackRecord) {
    console.log(`[PRICE-UTILS] Found fallback price record (ignoring date):`, {
      id: fallbackRecord.id,
      price: fallbackRecord.price,
      validFrom: fallbackRecord.valid_from
    });
    // Uncomment the line below if you want to use the fallback price
    // return { price: Number(fallbackRecord.price), validFrom: fallbackRecord.valid_from };
  }
  
  console.log(`[PRICE-UTILS] No price found for ${fuelType} at station ${stationId}`);
  return null;
}
