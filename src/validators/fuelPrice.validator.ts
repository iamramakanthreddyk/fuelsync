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
    const ts = new Date(validFrom);
    if (isNaN(ts.getTime())) {
      throw new Error('validFrom invalid');
    }
    validFromDate = ts;
  } else {
    validFromDate = new Date();
  }

  let effectiveToDate: Date | undefined;
  if (effectiveTo !== undefined && effectiveTo !== null) {
    const et = new Date(effectiveTo);
    if (isNaN(et.getTime())) {
      throw new Error('effectiveTo invalid');
    }
    if (et <= validFromDate) {
      throw new Error('effectiveTo must be later than validFrom');
    }
    effectiveToDate = et;
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
