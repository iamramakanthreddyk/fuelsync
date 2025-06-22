import { Pool, PoolClient } from 'pg';

export interface ReconciliationTotals {
  totalSales: number;
  cashTotal: number;
  cardTotal: number;
  upiTotal: number;
  creditTotal: number;
}

export async function isDayFinalized(
  db: Pool | PoolClient,
  tenantId: string,
  stationId: string,
  date: Date
): Promise<boolean> {
  const res = await db.query(
    `SELECT finalized FROM ${tenantId}.day_reconciliations WHERE station_id = $1 AND date = $2`,
    [stationId, date]
  );
  return res.rowCount ? res.rows[0].finalized : false;
}

export async function isDateFinalized(
  db: Pool | PoolClient,
  tenantId: string,
  date: Date
): Promise<boolean> {
  const res = await db.query(
    `SELECT 1 FROM ${tenantId}.day_reconciliations WHERE date = $1 AND finalized = true LIMIT 1`,
    [date]
  );
  return !!res.rowCount;
}

export async function runReconciliation(
  db: Pool,
  tenantId: string,
  stationId: string,
  date: Date
): Promise<ReconciliationTotals> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query<{ id: string; finalized: boolean }>(
      `SELECT id, finalized FROM ${tenantId}.day_reconciliations WHERE station_id = $1 AND date = $2`,
      [stationId, date]
    );
    if (existing.rowCount && existing.rows[0].finalized) {
      throw new Error('Reconciliation already finalized');
    }

    const totals = await client.query<{
      total_sales: number;
      cash_total: number;
      card_total: number;
      upi_total: number;
      credit_total: number;
    }>(
      `SELECT
        COALESCE(SUM(s.sale_amount),0) AS total_sales,
        COALESCE(SUM(CASE WHEN s.payment_method='cash' THEN s.sale_amount ELSE 0 END),0) AS cash_total,
        COALESCE(SUM(CASE WHEN s.payment_method='card' THEN s.sale_amount ELSE 0 END),0) AS card_total,
        COALESCE(SUM(CASE WHEN s.payment_method='upi' THEN s.sale_amount ELSE 0 END),0) AS upi_total,
        COALESCE(SUM(CASE WHEN s.payment_method='credit' THEN s.sale_amount ELSE 0 END),0) AS credit_total
       FROM ${tenantId}.sales s
       JOIN ${tenantId}.nozzles n ON s.nozzle_id = n.id
       JOIN ${tenantId}.pumps p ON n.pump_id = p.id
       WHERE p.station_id = $1 AND DATE(s.sold_at) = $2`,
      [stationId, date]
    );
    const row = totals.rows[0];
    if (existing.rowCount) {
      await client.query(
        `UPDATE ${tenantId}.day_reconciliations
           SET total_sales=$2, cash_total=$3, card_total=$4, upi_total=$5, credit_total=$6, finalized=true, updated_at=NOW()
         WHERE id=$1`,
        [existing.rows[0].id, row.total_sales, row.cash_total, row.card_total, row.upi_total, row.credit_total]
      );
    } else {
      await client.query(
        `INSERT INTO ${tenantId}.day_reconciliations (station_id, date, total_sales, cash_total, card_total, upi_total, credit_total, finalized)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
        [stationId, date, row.total_sales, row.cash_total, row.card_total, row.upi_total, row.credit_total]
      );
    }
    await client.query('COMMIT');
    return {
      totalSales: Number(row.total_sales),
      cashTotal: Number(row.cash_total),
      cardTotal: Number(row.card_total),
      upiTotal: Number(row.upi_total),
      creditTotal: Number(row.credit_total),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getReconciliation(
  db: Pool,
  tenantId: string,
  stationId: string,
  date: Date
) {
  const res = await db.query(
    `SELECT station_id, date, total_sales, cash_total, card_total, upi_total, credit_total, finalized
     FROM ${tenantId}.day_reconciliations WHERE station_id = $1 AND date = $2`,
    [stationId, date]
  );
  return res.rows[0];
}
