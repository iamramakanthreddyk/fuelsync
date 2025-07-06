import { createDashboardHandlers } from '../src/controllers/dashboard.controller';

const db = {
  query: jest.fn()
} as any;

const handlers = createDashboardHandlers(db);

const res = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
} as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('dashboard.controller.getSalesSummary', () => {
  test('returns 403 when station access denied', async () => {
    const req = {
      user: { userId: 'u1', tenantId: 't1' },
      query: { stationId: 's1' }
    } as any;
    db.query.mockResolvedValueOnce({ rowCount: 0 });

    await handlers.getSalesSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Station access denied' });
  });

  test('executes query when access allowed', async () => {
    const req = {
      user: { userId: 'u1', tenantId: 't1' },
      query: { stationId: 's1' }
    } as any;
    db.query.mockResolvedValueOnce({ rowCount: 1 });
    db.query.mockResolvedValueOnce({ rows: [{
      total_sales: 10,
      total_profit: 2,
      total_volume: 3,
      transaction_count: 1,
      profit_margin: 20
    }] });

    await handlers.getSalesSummary(req, res);

    expect(db.query).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        totalRevenue: 10,
        totalProfit: 2,
        profitMargin: 20,
        totalVolume: 3,
        salesCount: 1,
        period: 'monthly'
      }
    });
  });
});
