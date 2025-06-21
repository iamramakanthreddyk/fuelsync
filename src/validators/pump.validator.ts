export interface PumpInput {
  stationId: string;
  label: string;
}

export function validateCreatePump(data: any): PumpInput {
  const { stationId, label } = data || {};
  if (!stationId || typeof stationId !== 'string') {
    throw new Error('stationId required');
  }
  if (!label || typeof label !== 'string') {
    throw new Error('label required');
  }
  return { stationId, label };
}
