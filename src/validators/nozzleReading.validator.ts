export interface NozzleReadingInput {
  nozzleId: string;
  reading: number;
  recordedAt: Date;
  paymentMethod: 'cash' | 'card' | 'upi' | 'credit' | 'bank_transfer' | 'check';
  creditorId?: string;
}

export interface ReadingQuery {
  stationId?: string;
  nozzleId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
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
  const result: NozzleReadingInput = { nozzleId, reading: readingNum, recordedAt: ts, paymentMethod: 'cash' };
  
  if (paymentMethod && ['cash', 'card', 'upi', 'credit', 'bank_transfer', 'check'].includes(paymentMethod)) {
    result.paymentMethod = paymentMethod as 'cash' | 'card' | 'upi' | 'credit' | 'bank_transfer' | 'check';
  }
  
  if (creditorId && typeof creditorId === 'string') {
    result.creditorId = creditorId;
    if (!result.paymentMethod) {
      result.paymentMethod = 'credit';
    }
  }

  return result;
}

export interface ReadingQueryParsed {
  nozzleId?: string;
  stationId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export function parseReadingQuery(query: any): ReadingQueryParsed {
  const { nozzleId, startDate, endDate, from, to, limit, stationId } = query || {};
  const result: ReadingQueryParsed = {};
  
  // Validate nozzleId is a non-empty string and valid UUID
  if (nozzleId && typeof nozzleId === 'string' && nozzleId.trim() !== '') {
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(nozzleId)) {
      result.nozzleId = nozzleId;
    } else {
      console.warn(`[READING-VALIDATOR] Invalid nozzleId format: ${nozzleId}`);
      throw new Error('Invalid UUID format in request parameters');
    }
  }
  
  // Validate stationId is a non-empty string and valid UUID if provided
  if (stationId && typeof stationId === 'string' && stationId.trim() !== '') {
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(stationId)) {
      result.stationId = stationId;
    } else {
      console.warn(`[READING-VALIDATOR] Invalid stationId format: ${stationId}`);
      throw new Error('Invalid UUID format in request parameters');
    }
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

  if (limit) {
    const n = parseInt(limit as string, 10);
    if (!isNaN(n) && n > 0) result.limit = n;
  }

  return result;
}