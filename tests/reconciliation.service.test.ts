import {
  isFinalized,
  getOrCreateDailyReconciliation,
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
});
