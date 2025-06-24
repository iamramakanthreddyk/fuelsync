export interface PumpInput {
  stationId: string;
  label: string;
  serialNumber?: string;
}

export function validateCreatePump(data: any): PumpInput {
  const { stationId, name, label, serialNumber } = data || {};
  if (!stationId || typeof stationId !== 'string') {
    throw new Error('stationId required');
  }
  const pumpLabel = name || label;
  if (!pumpLabel || typeof pumpLabel !== 'string') {
    throw new Error('name or label required');
  }
  return { stationId, label: pumpLabel, serialNumber };
}
