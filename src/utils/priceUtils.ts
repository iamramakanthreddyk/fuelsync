import { PrismaClient } from '@prisma/client';

export interface PriceRecord {
  price: number;
  validFrom: Date;
}

export async function getPriceAtTimestamp(
  prisma: PrismaClient,
  tenantId: string,
  stationId: string,
  fuelType: string,
  timestamp: Date
): Promise<PriceRecord | null> {
  const record = await prisma.fuelPrice.findFirst({
    where: {
      tenantId: tenantId,
      stationId: stationId,
      fuelType: fuelType,
      validFrom: { lte: timestamp },
    },
    orderBy: { validFrom: 'desc' },
  });
  if (!record) return null;
  return { price: Number(record.price), validFrom: record.validFrom };
}
