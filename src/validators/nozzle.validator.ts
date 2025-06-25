export interface NozzleInput {
  pumpId: string;
  nozzleNumber: number;
  fuelType: string;
}

export function validateCreateNozzle(data: any): NozzleInput {
  const { pumpId, nozzleNumber, fuelType } = data || {};
  if (!pumpId || typeof pumpId !== 'string') {
    throw new Error('pumpId required');
  }
  if (!nozzleNumber || typeof nozzleNumber !== 'number') {
    throw new Error('nozzleNumber required');
  }
  if (!fuelType || typeof fuelType !== 'string') {
    throw new Error('fuelType required');
  }
  return { pumpId, nozzleNumber, fuelType };
}
