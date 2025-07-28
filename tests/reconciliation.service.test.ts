import {
  isFinalized,
  getOrCreateDailyReconciliation,
  markDayAsFinalized,
  runReconciliation,
} from '../src/services/reconciliation.service';

describe('reconciliation.service helpers', () => {
  test('returns boolean', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ finalized: true }] }) } as any;
    const res = await isFinalized(db, 't1', 's1', new Date());
    expect(res).toBe(true);
  });

  test('creates reconciliation row when missing', async () => {
    const queries: any[] = [];
    const db = {
      query: jest.fn((q: string) => {
        queries.push(q);
        if (queries.length === 1) return Promise.resolve({ rowCount: 0, rows: [] });
        if (queries.length === 2) return Promise.resolve({ rowCount: 1 });
        return Promise.resolve({ rowCount: 1, rows: [{ id: '1', station_id: 's1', date: new Date(), total_sales: 0, cash_total: 0, card_total: 0, upi_total: 0, credit_total: 0, opening_reading: 0, closing_reading: 0, variance: 0, finalized: false }] });
      }),
    } as any;
    const row = await getOrCreateDailyReconciliation(db, 't1', 's1', new Date());
    expect(row.id).toBe('1');
    expect(queries.length).toBe(3);
  });

  test('throws error for invalid station', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0 })
    } as any;
    await expect(getOrCreateDailyReconciliation(db, 't1', 'bad', new Date()))
      .rejects.toThrow('Station not found');
  });

  function mockPool(responses: any[]) {
    let i = 0;
    const client = {
      query: jest.fn(() => Promise.resolve(responses[i++] || {})),
      release: jest.fn(),
    } as any;
    return {
      connect: jest.fn().mockResolvedValue(client),
      query: client.query,
      client,
    } as any;
  }

  test('markDayAsFinalized updates record', async () => {
    const date = new Date();
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '1' }] })
        .mockResolvedValueOnce({}),
    } as any;
    await markDayAsFinalized(db, 't1', 's1', date);
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE public.day_reconciliations SET finalized = true, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
      ['1', 't1'],
    );
  });

  test('runReconciliation returns early when finalized', async () => {
    const date = new Date();
    const responses = [
      {},
      {
        rowCount: 1,
        rows: [
          {
            id: '1',
            total_sales: 5,
            cash_total: 5,
            card_total: 0,
            upi_total: 0,
            credit_total: 0,
            opening_reading: 10,
            closing_reading: 15,
            variance: 0,
            finalized: true,
          },
        ],
      },
      {},
    ];
    const pool = mockPool(responses);
    const res = await runReconciliation(pool, 't1', 's1', date);
    expect(res.reconciliationId).toBe('1');
    expect(pool.client.query).toHaveBeenCalledTimes(3);
  });

  test('runReconciliation does not finalize when no data', async () => {
    const date = new Date();
    const responses = [
      {},
      { rowCount: 1, rows: [{ id: '1', finalized: false }] },
      { rows: [{ total_sales: 0, cash_total: 0, card_total: 0, upi_total: 0, credit_total: 0 }] },
      { rows: [{ total_volume: 0 }] },
      { rows: [{ opening_reading: 0, closing_reading: 0 }] },
      {},
      { rowCount: 0 },
      {},
    ];
    const pool = mockPool(responses);
    const res = await runReconciliation(pool, 't1', 's1', date);
    expect(res.reconciliationId).toBe('1');
    const updateCall = pool.client.query.mock.calls.find((c: any) => String(c[0]).includes('UPDATE public.day_reconciliations'));
    expect(updateCall[1][10]).toBe(false); // finalized flag
  });
});
