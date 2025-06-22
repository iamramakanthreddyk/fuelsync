export interface NozzleReadingInput {
  nozzleId: string;
  reading: number;
  recordedAt: Date;
  creditorId?: string;
}

export interface ReadingQuery {
  stationId?: string;
  nozzleId?: string;
  from?: Date;
  to?: Date;
}

export function validateCreateNozzleReading(data: any): NozzleReadingInput {
  const { nozzleId, reading, recordedAt, creditorId } = data || {};
  if (!nozzleId || typeof nozzleId !== 'string') {
    throw new Error('nozzleId required');
  }
  const readingNum = parseFloat(reading);
  if (isNaN(readingNum)) {
    throw new Error('reading must be a number');
  }
  const ts = new Date(recordedAt);
  if (!recordedAt || isNaN(ts.getTime())) {
    throw new Error('recordedAt invalid');
  }
  const result: NozzleReadingInput = { nozzleId, reading: readingNum, recordedAt: ts };
  if (creditorId && typeof creditorId === 'string') {
    result.creditorId = creditorId;
  }
  return result;
}

export function parseReadingQuery(query: any): ReadingQuery {
  const { stationId, nozzleId, from, to } = query || {};
  const result: ReadingQuery = {};
  if (stationId && typeof stationId === 'string') {
    result.stationId = stationId;
  }
  if (nozzleId && typeof nozzleId === 'string') {
    result.nozzleId = nozzleId;
  }
  if (from) {
    const d = new Date(from);
    if (!isNaN(d.getTime())) result.from = d;
  }
  if (to) {
    const d = new Date(to);
    if (!isNaN(d.getTime())) result.to = d;
  }
  return result;
}
