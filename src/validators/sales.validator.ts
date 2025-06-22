export interface SalesQuery {
  stationId?: string;
  nozzleId?: string;
  startDate?: Date;
  endDate?: Date;
}

export function parseSalesQuery(query: any): SalesQuery {
  const { stationId, nozzleId, startDate, endDate } = query || {};
  const result: SalesQuery = {};
  if (stationId && typeof stationId === 'string') {
    result.stationId = stationId;
  }
  if (nozzleId && typeof nozzleId === 'string') {
    result.nozzleId = nozzleId;
  }
  if (startDate) {
    const d = new Date(startDate);
    if (!isNaN(d.getTime())) result.startDate = d;
  }
  if (endDate) {
    const d = new Date(endDate);
    if (!isNaN(d.getTime())) result.endDate = d;
  }
  return result;
}
