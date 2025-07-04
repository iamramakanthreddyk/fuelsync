import { Prisma, PrismaClient } from '@prisma/client';

type TxClient = PrismaClient | Prisma.TransactionClient;

export interface PriceRecord {
  price: number;
  validFrom: Date;
}

export async function getPriceAtTimestamp(
  client: TxClient,
  tenantId: string,
  stationId: string,
  fuelType: string,
  timestamp: Date
): Promise<PriceRecord | null> {
  const record = await client.fuelPrice.findFirst({
    where: {
      tenant_id: tenantId,
      station_id: stationId,
      fuel_type: fuelType,
      valid_from: { lte: timestamp },
    },
    orderBy: { valid_from: 'desc' },
    select: { price: true, valid_from: true },
  });
  if (!record) return null;
  return { price: Number(record.price), validFrom: record.valid_from };
}
