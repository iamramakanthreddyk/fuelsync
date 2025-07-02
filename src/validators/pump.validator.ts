export interface PumpInput {
  stationId: string;
  name: string;
  serialNumber?: string;
}

export function validateCreatePump(data: any): PumpInput {
  const { stationId, name, serialNumber } = data || {};
  if (!stationId || typeof stationId !== 'string') {
    throw new Error('stationId required');
  }
  if (!name || typeof name !== 'string') {
    throw new Error('name required');
  }
  return { stationId, name, serialNumber };
}
