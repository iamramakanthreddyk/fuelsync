export interface FuelPriceInput {
  stationId: string;
  fuelType: string;
  price: number;
  effectiveFrom: Date;
}

export interface FuelPriceQuery {
  stationId?: string;
  fuelType?: string;
}

export function validateCreateFuelPrice(data: any): FuelPriceInput {
  const { stationId, fuelType, price, effectiveFrom } = data || {};
  if (!stationId || typeof stationId !== 'string') {
    throw new Error('stationId required');
  }
  if (!fuelType || typeof fuelType !== 'string') {
    throw new Error('fuelType required');
  }
  const priceNum = parseFloat(price);
  if (isNaN(priceNum) || priceNum <= 0) {
    throw new Error('price must be > 0');
  }
  const ts = new Date(effectiveFrom);
  if (!effectiveFrom || isNaN(ts.getTime())) {
    throw new Error('effectiveFrom invalid');
  }
  return { stationId, fuelType, price: priceNum, effectiveFrom: ts };
}

export function parseFuelPriceQuery(query: any): FuelPriceQuery {
  const { stationId, fuelType } = query || {};
  const result: FuelPriceQuery = {};
  if (stationId && typeof stationId === 'string') {
    result.stationId = stationId;
  }
  if (fuelType && typeof fuelType === 'string') {
    result.fuelType = fuelType;
  }
  return result;
}
