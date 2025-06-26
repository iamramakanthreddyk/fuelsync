export interface NozzleReadingInput {
  nozzleId: string;
  reading: number;
  recordedAt: Date;
  paymentMethod?: 'cash' | 'card' | 'upi' | 'credit';
  creditorId?: string;
}

export interface ReadingQuery {
  stationId?: string;
  nozzleId?: string;
  from?: Date;
  to?: Date;
}

export function validateCreateNozzleReading(data: any): NozzleReadingInput {
  const { nozzleId, reading, recordedAt, creditorId, paymentMethod } = data || {};
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
  
  if (paymentMethod && ['cash', 'card', 'upi', 'credit'].includes(paymentMethod)) {
    result.paymentMethod = paymentMethod as 'cash' | 'card' | 'upi' | 'credit';
  }
  
  if (creditorId && typeof creditorId === 'string') {
    result.creditorId = creditorId;
    // Default to credit payment method if creditor is specified
    if (!result.paymentMethod) {
      result.paymentMethod = 'credit';
    }
  }
  
  return result;
}

export interface ReadingQueryParsed {
  nozzleId?: string;
  startDate?: Date;
  endDate?: Date;
}

export function parseReadingQuery(query: any): ReadingQueryParsed {
  const { nozzleId, startDate, endDate, from, to } = query || {};
  const result: ReadingQueryParsed = {};
  
  if (nozzleId && typeof nozzleId === 'string') {
    result.nozzleId = nozzleId;
  }
  
  // Handle both startDate/endDate and from/to formats
  const start = startDate || from;
  const end = endDate || to;
  
  if (start) {
    const d = new Date(start);
    if (!isNaN(d.getTime())) result.startDate = d;
  }
  if (end) {
    const d = new Date(end);
    if (!isNaN(d.getTime())) result.endDate = d;
  }
  
  return result;
}