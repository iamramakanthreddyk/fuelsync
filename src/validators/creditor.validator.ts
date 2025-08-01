export interface CreditorInput {
  partyName: string;
  contactNumber?: string;
  address?: string;
  creditLimit?: number;
  stationId?: string; // Add stationId to link creditor to station
}

export interface CreditPaymentInput {
  creditorId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
}

export interface PaymentQuery {
  creditorId?: string;
}

export function validateCreateCreditor(data: any): CreditorInput {
  const { partyName, contactNumber, address, creditLimit, stationId } = data || {};
  if (!partyName || typeof partyName !== 'string') {
    throw new Error('partyName required');
  }
  let limitNum: number | undefined = undefined;
  if (creditLimit !== undefined) {
    const n = parseFloat(creditLimit);
    if (isNaN(n) || n < 0) {
      throw new Error('creditLimit must be >= 0');
    }
    limitNum = n;
  }
  // Validate stationId if provided
  if (stationId && typeof stationId !== 'string') {
    throw new Error('stationId must be a string');
  }
  return { partyName, contactNumber, address, creditLimit: limitNum, stationId };
}

export function validateUpdateCreditor(data: any): CreditorInput {
  const { partyName, contactNumber, address, creditLimit, stationId } = data || {};
  if (!partyName && !contactNumber && !address && creditLimit === undefined && !stationId) {
    throw new Error('No update fields');
  }
  let limitNum: number | undefined = undefined;
  if (creditLimit !== undefined) {
    const n = parseFloat(creditLimit);
    if (isNaN(n) || n < 0) {
      throw new Error('creditLimit must be >= 0');
    }
    limitNum = n;
  }
  // Validate stationId if provided
  if (stationId && typeof stationId !== 'string') {
    throw new Error('stationId must be a string');
  }
  return { partyName, contactNumber, address, creditLimit: limitNum, stationId };
}

export function validateCreatePayment(data: any): CreditPaymentInput {
  const { creditorId, amount, paymentMethod, referenceNumber } = data || {};
  if (!creditorId || typeof creditorId !== 'string') {
    throw new Error('creditorId required');
  }
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    throw new Error('amount must be > 0');
  }
  if (!paymentMethod || typeof paymentMethod !== 'string') {
    throw new Error('paymentMethod required');
  }
  return { creditorId, amount: amt, paymentMethod, referenceNumber };
}

export function parsePaymentQuery(query: any): PaymentQuery {
  const { creditorId } = query || {};
  const result: PaymentQuery = {};
  if (creditorId && typeof creditorId === 'string') {
    result.creditorId = creditorId;
  }
  return result;
}
