import {
  isFinalized,
  getOrCreateDailyReconciliation,
  markDayAsFinalized,
  runReconciliation,
  // New improved functions
  getSystemCalculatedSales,
  getUserEnteredCash,
  generateReconciliationSummary,
  closeDayReconciliation,
  getReconciliationAnalytics,
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

// ============================================================================
// IMPROVED RECONCILIATION TESTS - New "System vs Reality" approach
// ============================================================================

describe('improved reconciliation functions', () => {
  const mockDb = {
    query: jest.fn()
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemCalculatedSales', () => {
    test('calculates system sales correctly', async () => {
      const mockSalesData = [
        { fuel_type: 'petrol', payment_method: 'cash', total_volume: 100, total_amount: 5000 },
        { fuel_type: 'petrol', payment_method: 'card', total_volume: 50, total_amount: 2500 },
        { fuel_type: 'diesel', payment_method: 'cash', total_volume: 80, total_amount: 4000 },
        { fuel_type: 'diesel', payment_method: 'upi', total_volume: 30, total_amount: 1500 }
      ];

      mockDb.query.mockResolvedValue({ rows: mockSalesData });

      const result = await getSystemCalculatedSales(mockDb, 'tenant1', 'station1', '2024-01-15');

      expect(result.totalVolume).toBe(260);
      expect(result.totalRevenue).toBe(13000);
      expect(result.cashSales).toBe(9000);
      expect(result.cardSales).toBe(2500);
      expect(result.upiSales).toBe(1500);
      expect(result.creditSales).toBe(0);
      expect(result.fuelBreakdown.petrol.volume).toBe(150);
      expect(result.fuelBreakdown.petrol.revenue).toBe(7500);
      expect(result.fuelBreakdown.diesel.volume).toBe(110);
      expect(result.fuelBreakdown.diesel.revenue).toBe(5500);
    });

    test('handles empty sales data', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await getSystemCalculatedSales(mockDb, 'tenant1', 'station1', '2024-01-15');

      expect(result.totalVolume).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.cashSales).toBe(0);
      expect(result.cardSales).toBe(0);
      expect(result.upiSales).toBe(0);
      expect(result.creditSales).toBe(0);
    });
  });

  describe('getUserEnteredCash', () => {
    test('calculates user entered cash correctly', async () => {
      const mockCashData = [
        { cash_collected: 4950, card_collected: 2500, upi_collected: 1500 }
      ];

      mockDb.query.mockResolvedValue({ rows: mockCashData });

      const result = await getUserEnteredCash(mockDb, 'tenant1', 'station1', '2024-01-15');

      expect(result.cashCollected).toBe(4950);
      expect(result.cardCollected).toBe(2500);
      expect(result.upiCollected).toBe(1500);
      expect(result.totalCollected).toBe(8950);
    });

    test('handles no cash reports', async () => {
      mockDb.query.mockResolvedValue({ rows: [{}] });

      const result = await getUserEnteredCash(mockDb, 'tenant1', 'station1', '2024-01-15');

      expect(result.cashCollected).toBe(0);
      expect(result.cardCollected).toBe(0);
      expect(result.upiCollected).toBe(0);
      expect(result.totalCollected).toBe(0);
    });
  });

  describe('generateReconciliationSummary', () => {
    test('generates complete reconciliation summary', async () => {
      // Mock station name
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ name: 'Test Station' }] })
        // Mock system sales
        .mockResolvedValueOnce({
          rows: [
            { fuel_type: 'petrol', payment_method: 'cash', total_volume: 100, total_amount: 5000 }
          ]
        })
        // Mock user cash
        .mockResolvedValueOnce({
          rows: [{ cash_collected: 4950, card_collected: 0, upi_collected: 0 }]
        })
        // Mock reconciliation status
        .mockResolvedValueOnce({ rows: [] });

      const result = await generateReconciliationSummary(mockDb, 'tenant1', 'station1', '2024-01-15');

      expect(result.stationName).toBe('Test Station');
      expect(result.systemCalculated.totalRevenue).toBe(5000);
      expect(result.userEntered.totalCollected).toBe(4950);
      expect(result.differences.totalDifference).toBe(-50); // 4950 - 5000
      expect(result.isReconciled).toBe(false);
      expect(result.canCloseBackdated).toBe(true); // Within 7 days
    });

    test('detects already reconciled day', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ name: 'Test Station' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({
          rows: [{ finalized: true, closed_by: 'user1', closed_at: new Date() }]
        });

      const result = await generateReconciliationSummary(mockDb, 'tenant1', 'station1', '2024-01-15');

      expect(result.isReconciled).toBe(true);
      expect(result.reconciledBy).toBe('user1');
    });

    test('detects backdated closure restriction', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago
      const dateString = oldDate.toISOString().split('T')[0];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ name: 'Test Station' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await generateReconciliationSummary(mockDb, 'tenant1', 'station1', dateString);

      expect(result.canCloseBackdated).toBe(false); // More than 7 days old
    });
  });

  describe('getReconciliationAnalytics', () => {
    test('calculates analytics correctly', async () => {
      const mockAnalyticsData = [
        { station_id: 'station1', station_name: 'Station 1', finalized: true, difference: 50 },
        { station_id: 'station1', station_name: 'Station 1', finalized: true, difference: 30 },
        { station_id: 'station2', station_name: 'Station 2', finalized: false, difference: 100 }
      ];

      mockDb.query.mockResolvedValue({ rows: mockAnalyticsData });

      const result = await getReconciliationAnalytics(mockDb, 'tenant1');

      expect(result.totalReconciliations).toBe(3);
      expect(result.finalizedReconciliations).toBe(2);
      expect(result.averageDifference).toBe(60); // (50 + 30 + 100) / 3
      expect(result.largestDifference).toBe(100);
      expect(result.reconciliationRate).toBe(66.67); // 2/3 * 100, rounded
      expect(result.stationBreakdown).toHaveLength(2);
    });

    test('handles empty analytics data', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await getReconciliationAnalytics(mockDb, 'tenant1');

      expect(result.totalReconciliations).toBe(0);
      expect(result.finalizedReconciliations).toBe(0);
      expect(result.averageDifference).toBe(0);
      expect(result.largestDifference).toBe(0);
      expect(result.reconciliationRate).toBe(0);
      expect(result.stationBreakdown).toHaveLength(0);
    });

    test('filters by date range correctly', async () => {
      const mockAnalyticsData = [
        { station_id: 'station1', station_name: 'Station 1', finalized: true, difference: 50 }
      ];

      mockDb.query.mockResolvedValue({ rows: mockAnalyticsData });

      await getReconciliationAnalytics(mockDb, 'tenant1', '2024-01-01', '2024-01-31');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND dr.date >= $2'),
        expect.arrayContaining(['tenant1', '2024-01-01', '2024-01-31'])
      );
    });

    test('filters by station correctly', async () => {
      const mockAnalyticsData = [
        { station_id: 'station1', station_name: 'Station 1', finalized: true, difference: 50 }
      ];

      mockDb.query.mockResolvedValue({ rows: mockAnalyticsData });

      await getReconciliationAnalytics(mockDb, 'tenant1', undefined, undefined, 'station1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND dr.station_id = $2'),
        expect.arrayContaining(['tenant1', 'station1'])
      );
    });
  });

  describe('closeDayReconciliation', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    const mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient)
    } as any;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('closes day successfully', async () => {
      // Mock generateReconciliationSummary
      const mockSummary = {
        date: '2024-01-15',
        stationId: 'station1',
        stationName: 'Test Station',
        systemCalculated: { totalRevenue: 5000, cashSales: 3000, cardSales: 1000, upiSales: 1000, creditSales: 0 },
        userEntered: { totalCollected: 4950 },
        differences: { totalDifference: -50 },
        isReconciled: false,
        canCloseBackdated: true
      };

      // Mock database calls
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ name: 'Test Station' }] }) // station name
        .mockResolvedValueOnce({ rows: [] }) // system sales
        .mockResolvedValueOnce({ rows: [{}] }) // user cash
        .mockResolvedValueOnce({ rows: [] }) // reconciliation status
        .mockResolvedValueOnce(undefined) // INSERT reconciliation
        .mockResolvedValueOnce(undefined) // UPDATE sales
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await closeDayReconciliation(mockPool, 'tenant1', 'station1', '2024-01-15', 'user1', 'Test notes');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result.isReconciled).toBe(true);
      expect(result.reconciledBy).toBe('user1');
      expect(result.notes).toBe('Test notes');
    });

    test('prevents backdated closure beyond 7 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const dateString = oldDate.toISOString().split('T')[0];

      // Mock generateReconciliationSummary to return canCloseBackdated: false
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ name: 'Test Station' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        closeDayReconciliation(mockPool, 'tenant1', 'station1', dateString, 'user1')
      ).rejects.toThrow('Backdated closures are only allowed within 7 days');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('handles database errors correctly', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        closeDayReconciliation(mockPool, 'tenant1', 'station1', '2024-01-15', 'user1')
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('allows same-day closure even if already reconciled', async () => {
      const today = new Date().toISOString().split('T')[0];

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ name: 'Test Station' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [{ finalized: true }] }) // already reconciled
        .mockResolvedValueOnce(undefined) // INSERT reconciliation
        .mockResolvedValueOnce(undefined) // UPDATE sales
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await closeDayReconciliation(mockPool, 'tenant1', 'station1', today, 'user1');

      expect(result.isReconciled).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('edge cases and error handling', () => {
    test('handles null/undefined values in sales data', async () => {
      const mockSalesData = [
        { fuel_type: null, payment_method: 'cash', total_volume: null, total_amount: null },
        { fuel_type: 'petrol', payment_method: null, total_volume: 100, total_amount: 5000 }
      ];

      mockDb.query.mockResolvedValue({ rows: mockSalesData });

      const result = await getSystemCalculatedSales(mockDb, 'tenant1', 'station1', '2024-01-15');

      expect(result.totalVolume).toBe(100);
      expect(result.totalRevenue).toBe(5000);
      expect(result.cashSales).toBe(0); // null payment_method should not add to cash
    });

    test('handles invalid date formats', async () => {
      mockDb.query.mockRejectedValue(new Error('Invalid date format'));

      await expect(
        getSystemCalculatedSales(mockDb, 'tenant1', 'station1', 'invalid-date')
      ).rejects.toThrow('Invalid date format');
    });

    test('handles missing station', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // No station found
        .mockResolvedValueOnce({ rows: [] }) // No sales
        .mockResolvedValueOnce({ rows: [{}] }) // No cash
        .mockResolvedValueOnce({ rows: [] }); // No reconciliation

      const result = await generateReconciliationSummary(mockDb, 'tenant1', 'nonexistent-station', '2024-01-15');

      expect(result.stationName).toBe('Unknown Station');
    });

    test('handles very large numbers correctly', async () => {
      const mockSalesData = [
        { fuel_type: 'petrol', payment_method: 'cash', total_volume: 999999.99, total_amount: 99999999.99 }
      ];

      mockDb.query.mockResolvedValue({ rows: mockSalesData });

      const result = await getSystemCalculatedSales(mockDb, 'tenant1', 'station1', '2024-01-15');

      expect(result.totalVolume).toBe(999999.99);
      expect(result.totalRevenue).toBe(99999999.99);
      expect(result.cashSales).toBe(99999999.99);
    });

    test('handles concurrent reconciliation attempts', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient)
      } as any;

      // Simulate concurrent modification error
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ name: 'Test Station' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));

      await expect(
        closeDayReconciliation(mockPool, 'tenant1', 'station1', '2024-01-15', 'user1')
      ).rejects.toThrow('duplicate key value violates unique constraint');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
