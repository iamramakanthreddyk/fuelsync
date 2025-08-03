import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { CreditorInput, CreditPaymentInput, PaymentQuery } from '../validators/creditor.validator';
import { isDateFinalized } from './reconciliation.service';
import { parseRows, parseRow } from '../utils/parseDb';

export async function createCreditor(db: Pool, tenantId: string, input: CreditorInput): Promise<string> {
  // Check if station exists if stationId is provided
  if (input.stationId) {
    const stationCheck = await db.query(
      'SELECT id FROM public.stations WHERE id = $1 AND tenant_id = $2',
      [input.stationId, tenantId]
    );
    if (stationCheck.rowCount === 0) {
      throw new Error('Invalid station ID');
    }
  }
  
  const res = await db.query<{ id: string }>(
    `INSERT INTO public.creditors (id, tenant_id, party_name, contact_number, address, credit_limit, station_id, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING id`,
    [randomUUID(), tenantId, input.partyName, input.contactNumber || null, input.address || null, input.creditLimit || 0, input.stationId || null]
  );
  return res.rows[0].id;
}

export async function listCreditors(db: Pool, tenantId: string, stationId?: string) {
  let query = `
    SELECT 
      c.id, c.party_name, c.contact_number, c.address, c.credit_limit, c.status, c.created_at, c.station_id, s.name as station_name,
      COALESCE(credit_sales.total_credit, 0) - COALESCE(payments.total_payments, 0) as current_balance,
      CASE WHEN c.credit_limit > 0 THEN 
        ((COALESCE(credit_sales.total_credit, 0) - COALESCE(payments.total_payments, 0)) / c.credit_limit) * 100 
      ELSE 0 END as credit_utilization
    FROM public.creditors c 
    LEFT JOIN public.stations s ON c.station_id = s.id
    LEFT JOIN (
      SELECT creditor_id, SUM(amount) as total_credit
      FROM public.sales
      WHERE tenant_id = $1 AND payment_method = 'credit' AND creditor_id IS NOT NULL
      GROUP BY creditor_id
    ) credit_sales ON c.id = credit_sales.creditor_id
    LEFT JOIN (
      SELECT creditor_id, SUM(amount) as total_payments
      FROM public.credit_payments
      WHERE tenant_id = $1
      GROUP BY creditor_id
    ) payments ON c.id = payments.creditor_id
    WHERE c.tenant_id = $1
  `;
  const params = [tenantId];
  
  // Filter by station if provided and ensure it's a string
  if (stationId && typeof stationId === 'string') {
    query += ' AND (c.station_id = $2 OR c.station_id IS NULL)';
    params.push(stationId);
  } else if (stationId && typeof stationId !== 'string') {
    console.warn(`Invalid stationId type: ${typeof stationId}. Expected string.`);
    // Don't add the filter if stationId is not a string
  }
  
  query += ' ORDER BY c.party_name';
  const res = await db.query(query, params);
  return parseRows(res.rows);
}

export async function updateCreditor(db: Pool, tenantId: string, id: string, input: CreditorInput) {
  // Check if station exists if stationId is provided
  if (input.stationId) {
    const stationCheck = await db.query(
      'SELECT id FROM public.stations WHERE id = $1 AND tenant_id = $2',
      [input.stationId, tenantId]
    );
    if (stationCheck.rowCount === 0) {
      throw new Error('Invalid station ID');
    }
  }
  
  await db.query(
    `UPDATE public.creditors SET
      party_name = COALESCE($2, party_name),
      contact_number = COALESCE($3, contact_number),
      address = COALESCE($4, address),
      credit_limit = COALESCE($5, credit_limit),
      station_id = COALESCE($6, station_id)
     WHERE id = $1 AND tenant_id = $7`,
    [id, input.partyName || null, input.contactNumber || null, input.address || null, input.creditLimit, input.stationId, tenantId]
  );
}

export async function markCreditorInactive(db: Pool, tenantId: string, id: string) {
  await db.query('UPDATE public.creditors SET status = $3 WHERE id = $1 AND tenant_id = $2', [id, tenantId, 'inactive']);
}

export async function getCreditorById(db: Pool | PoolClient, tenantId: string, id: string) {
  const res = await db.query<{ id: string; credit_limit: number }>(
    'SELECT id, credit_limit FROM public.creditors WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return parseRow(res.rows[0]);
}

export async function incrementCreditorBalance(db: Pool | PoolClient, tenantId: string, id: string, amount: number) {
  // Balance is calculated from sales and payments, no direct update needed
  console.log(`Credit given to creditor ${id}: ${amount}`);
}

export async function decrementCreditorBalance(db: Pool | PoolClient, tenantId: string, id: string, amount: number) {
  // Balance is calculated from sales and payments, no direct update needed
  console.log(`Payment received from creditor ${id}: ${amount}`);
}

export async function getCreditorBalance(db: Pool | PoolClient, tenantId: string, creditorId: string): Promise<number> {
  const query = `
    SELECT 
      COALESCE(credit_sales.total_credit, 0) - COALESCE(payments.total_payments, 0) as balance
    FROM public.creditors c
    LEFT JOIN (
      SELECT creditor_id, SUM(amount) as total_credit
      FROM public.sales
      WHERE tenant_id = $1 AND payment_method = 'credit' AND creditor_id = $2 AND creditor_id IS NOT NULL
      GROUP BY creditor_id
    ) credit_sales ON c.id = credit_sales.creditor_id
    LEFT JOIN (
      SELECT creditor_id, SUM(amount) as total_payments
      FROM public.credit_payments
      WHERE tenant_id = $1 AND creditor_id = $2
      GROUP BY creditor_id
    ) payments ON c.id = payments.creditor_id
    WHERE c.id = $2 AND c.tenant_id = $1
  `;
  
  const result = await db.query(query, [tenantId, creditorId]);
  return Number(result.rows[0]?.balance || 0);
}

export async function createCreditPayment(
  db: Pool,
  tenantId: string,
  input: CreditPaymentInput,
  userId: string
): Promise<string> {
  const res = await db.query<{ id: string }>(
    `INSERT INTO public.credit_payments (id, tenant_id, creditor_id, amount, payment_method, reference_number, received_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW(),NOW()) RETURNING id`,
    [randomUUID(), tenantId, input.creditorId, input.amount, input.paymentMethod, input.referenceNumber || null]
  );
  return res.rows[0].id;
}

export async function listCreditPayments(db: Pool, tenantId: string, query: PaymentQuery) {
  const params: any[] = [];
  let idx = 1;
  const conds: string[] = [];
  if (query.creditorId) {
    conds.push(`creditor_id = $${idx++}`);
    params.push(query.creditorId);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')} AND tenant_id = $${idx}` : `WHERE tenant_id = $${idx}`;
  params.push(tenantId);
  const res = await db.query(
    `SELECT id, creditor_id, amount, payment_method, reference_number, received_at, created_at
     FROM public.credit_payments ${where}
     ORDER BY received_at DESC`,
    params
  );
  return parseRows(res.rows);
}
