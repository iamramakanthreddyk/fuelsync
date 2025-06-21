export interface StationInput {
  name: string;
  location?: string;
}

export function validateCreateStation(data: any): StationInput {
  const { name, location } = data || {};
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid station name');
  }
  return { name, location };
}

export function validateUpdateStation(data: any): StationInput {
  const { name, location } = data || {};
  if (!name && !location) {
    throw new Error('No update fields');
  }
  return { name, location };
}
