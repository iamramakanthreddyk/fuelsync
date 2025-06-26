import prisma from '../utils/prisma';

/** Supports frontend alert deletion */
export async function deleteAlert(tenantId: string, alertId: string): Promise<boolean> {
  const result = await prisma.alert.deleteMany({
    where: { id: alertId, tenant_id: tenantId }
  });
  return result.count > 0;
}
