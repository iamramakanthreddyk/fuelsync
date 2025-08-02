import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import prisma from '../utils/prisma';
import { beforeCreateNozzle } from '../middlewares/planEnforcement';
import { parseRows } from '../utils/parseDb';

export async function createNozzle(
  _db: Pool,
  tenantId: string,
  pumpId: string,
  nozzleNumber: number,
  fuelType: string
): Promise<string> {
  return prisma.$transaction(async tx => {
    await beforeCreateNozzle(tx, tenantId, pumpId);
    const nozzle = await tx.nozzle.create({
      data: {
        id: randomUUID(),
        tenant_id: tenantId,
        pump_id: pumpId,
        nozzle_number: nozzleNumber,
        fuel_type: fuelType,
      },
      select: { id: true },
    });
    return nozzle.id;
  });
}

export async function updateNozzle(
  _db: Pool,
  tenantId: string,
  nozzleId: string,
  fuelType?: string,
  status?: string
): Promise<void> {
  const data: any = {};
  if (fuelType !== undefined) data.fuel_type = fuelType;
  if (status !== undefined) data.status = status;
  if (Object.keys(data).length === 0) return;
  await prisma.nozzle.updateMany({
    where: { id: nozzleId, tenant_id: tenantId },
    data,
  });
}

export async function listNozzles(
  _db: Pool,
  tenantId: string,
  pumpId?: string
) {
  // Get nozzles with their latest reading and station information
  // Ensure proper isolation - each nozzle gets its own reading, not shared data
  const sql = `
    SELECT
      n.id,
      n.tenant_id,
      n.pump_id,
      n.nozzle_number,
      n.fuel_type,
      n.status,
      n.created_at,
      n.updated_at,
      p.name as pump_name,
      p.station_id,
      s.name as station_name,
      (
        SELECT reading
        FROM public.nozzle_readings nr
        WHERE nr.nozzle_id = n.id
        AND nr.tenant_id = n.tenant_id
        AND nr.status != 'voided'
        ORDER BY nr.recorded_at DESC
        LIMIT 1
      ) as last_reading
    FROM public.nozzles n
    LEFT JOIN public.pumps p ON n.pump_id = p.id
    LEFT JOIN public.stations s ON p.station_id = s.id
    WHERE n.tenant_id = $1
    ${pumpId ? 'AND n.pump_id = $2' : ''}
    ORDER BY p.name ASC, n.nozzle_number ASC
  `;
  
  const params = pumpId ? [tenantId, pumpId] : [tenantId];
  console.log('[NOZZLE-SERVICE] Fetching nozzles with params:', params);
  console.log('[NOZZLE-SERVICE] SQL query:', sql);

  const nozzles = await prisma.$queryRawUnsafe(sql, ...params);
  const parsedNozzles = parseRows(nozzles as any);

  console.log('[NOZZLE-SERVICE] Raw nozzles from DB:', nozzles);
  console.log('[NOZZLE-SERVICE] Parsed nozzles:', parsedNozzles);

  // Log each nozzle's last reading for debugging
  parsedNozzles.forEach((nozzle: any) => {
    console.log(`[NOZZLE-SERVICE] Nozzle ${nozzle.id} (#${nozzle.nozzleNumber}) last_reading:`, nozzle.lastReading || nozzle.last_reading);
  });

  return parsedNozzles;
}

export async function deleteNozzle(
  _db: Pool,
  tenantId: string,
  nozzleId: string
) {
  const count = await prisma.sale.count({
    where: { nozzle_id: nozzleId, tenant_id: tenantId },
  });
  if (count > 0) {
    throw new Error('Cannot delete nozzle with sales history');
  }
  await prisma.nozzle.deleteMany({ where: { id: nozzleId, tenant_id: tenantId } });
}