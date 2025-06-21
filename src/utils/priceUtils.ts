export async function getPriceAtTimestamp(
  stationId: string,
  fuelType: string,
  timestamp: Date
): Promise<number | null> {
  // TODO: query tenant schema fuel_prices for price active at timestamp
  // Placeholder implementation will return null until services are built
  return null;
}

