export interface FuelPriceInput {
  stationId: string;
  fuelType: string;
  price: number;
  costPrice?: number;
  validFrom?: Date;
  effectiveTo?: Date;
}

export interface FuelPriceQuery {
  stationId?: string;
  fuelType?: string;
}

import { toStandardDateTime } from '../utils/dateUtils';

export function validateCreateFuelPrice(data: any): FuelPriceInput {
  const { stationId, fuelType, price, costPrice, validFrom, effectiveTo } = data || {};
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
  let costPriceNum = undefined;
  if (costPrice !== undefined && costPrice !== null) {
    costPriceNum = parseFloat(costPrice);
    if (isNaN(costPriceNum) || costPriceNum < 0) {
      throw new Error('costPrice must be >= 0');
    }
  }
  let validFromDate: Date;
  if (validFrom) {
    try {
      // Standardize to start of day
      validFromDate = toStandardDateTime(validFrom, true);
    } catch (err) {
      throw new Error('validFrom invalid');
    }
  } else {
    validFromDate = toStandardDateTime(new Date(), true);
  }

  let effectiveToDate: Date | undefined;
  if (effectiveTo !== undefined && effectiveTo !== null) {
    try {
      // Standardize to end of day
      effectiveToDate = toStandardDateTime(effectiveTo, false);
    } catch (err) {
      throw new Error('effectiveTo invalid');
    }
    if (effectiveToDate <= validFromDate) {
      throw new Error('effectiveTo must be later than validFrom');
    }
  }

  return { stationId, fuelType, price: priceNum, costPrice: costPriceNum, validFrom: validFromDate, effectiveTo: effectiveToDate };
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
