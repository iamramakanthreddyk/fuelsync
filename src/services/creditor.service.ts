import { Pool, PoolClient } from 'pg';
import { CreditorInput, CreditPaymentInput, PaymentQuery } from '../validators/creditor.validator';

export async function createCreditor(db: Pool, tenantId: string, input: CreditorInput): Promise<string> {
  const res = await db.query<{ id: string }>(
    `INSERT INTO ${tenantId}.creditors (tenant_id, party_name, contact_person, contact_phone, email, credit_limit)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [tenantId, input.partyName, input.contactPerson || null, input.contactPhone || null, input.email || null, input.creditLimit || 0]
  );
  return res.rows[0].id;
}

export async function listCreditors(db: Pool, tenantId: string) {
  const res = await db.query(
    `SELECT id, party_name, contact_person, contact_phone, email, credit_limit, balance, notes, created_at
     FROM ${tenantId}.creditors ORDER BY party_name`
  );
  return res.rows;
}

export async function updateCreditor(db: Pool, tenantId: string, id: string, input: CreditorInput) {
  await db.query(
    `UPDATE ${tenantId}.creditors SET
      party_name = COALESCE($2, party_name),
      contact_person = COALESCE($3, contact_person),
      contact_phone = COALESCE($4, contact_phone),
      email = COALESCE($5, email),
      credit_limit = COALESCE($6, credit_limit),
      updated_at = NOW()
     WHERE id = $1`,
    [id, input.partyName || null, input.contactPerson || null, input.contactPhone || null, input.email || null, input.creditLimit]
  );
}

export async function markCreditorInactive(db: Pool, tenantId: string, id: string) {
  await db.query(
    `UPDATE ${tenantId}.creditors SET credit_limit = 0, notes = COALESCE(notes,'') || '[INACTIVE]', updated_at = NOW() WHERE id = $1`,
    [id]
  );
}

export async function getCreditorById(db: Pool | PoolClient, tenantId: string, id: string) {
  const res = await db.query<{ id: string; credit_limit: number; balance: number }>(
    `SELECT id, credit_limit, balance FROM ${tenantId}.creditors WHERE id = $1`,
    [id]
  );
  return res.rows[0];
}

export async function incrementCreditorBalance(db: Pool | PoolClient, tenantId: string, id: string, amount: number) {
  await db.query(`UPDATE ${tenantId}.creditors SET balance = balance + $2 WHERE id = $1`, [id, amount]);
}

export async function decrementCreditorBalance(db: Pool | PoolClient, tenantId: string, id: string, amount: number) {
  await db.query(`UPDATE ${tenantId}.creditors SET balance = balance - $2 WHERE id = $1`, [id, amount]);
}

export async function createCreditPayment(
  db: Pool,
  tenantId: string,
  input: CreditPaymentInput,
  userId: string
): Promise<string> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const creditor = await getCreditorById(client, tenantId, input.creditorId);
    if (!creditor) {
      throw new Error('Invalid creditor');
    }
    const res = await client.query<{ id: string }>(
      `INSERT INTO ${tenantId}.credit_payments (tenant_id, creditor_id, amount, payment_method, reference_number, received_by, received_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
      [tenantId, input.creditorId, input.amount, input.paymentMethod, input.referenceNumber || null, userId]
    );
    await decrementCreditorBalance(client, tenantId, input.creditorId, input.amount);
    await client.query('COMMIT');
    return res.rows[0].id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listCreditPayments(db: Pool, tenantId: string, query: PaymentQuery) {
  const params: any[] = [];
  let idx = 1;
  const conds: string[] = [];
  if (query.creditorId) {
    conds.push(`creditor_id = $${idx++}`);
    params.push(query.creditorId);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const res = await db.query(
    `SELECT id, creditor_id, amount, payment_method, reference_number, received_at, created_at
     FROM ${tenantId}.credit_payments ${where}
     ORDER BY received_at DESC`,
    params
  );
  return res.rows;
}
