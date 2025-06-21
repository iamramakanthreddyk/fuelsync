export interface NozzleInput {
  pumpId: string;
  fuelType: string;
}

export function validateCreateNozzle(data: any): NozzleInput {
  const { pumpId, fuelType } = data || {};
  if (!pumpId || typeof pumpId !== 'string') {
    throw new Error('pumpId required');
  }
  if (!fuelType || typeof fuelType !== 'string') {
    throw new Error('fuelType required');
  }
  return { pumpId, fuelType };
}
