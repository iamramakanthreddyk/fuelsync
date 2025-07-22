import prisma from '../src/utils/prisma';
import { getHourlySales } from '../src/services/analytics.service';

jest.mock('../src/utils/prisma', () => ({
  $queryRaw: jest.fn()
}));

describe('analytics.getHourlySales', () => {
  test('returns raw hourly data', async () => {
    const rows = [{ hour: new Date('2023-01-01T01:00:00Z'), hour_num: 1, salesVolume: 10, salesAmount: 50, transactionCount: 5 }];
    (prisma.$queryRaw as jest.Mock).mockResolvedValue(rows);
    const result = await getHourlySales('t1', 's1', new Date('2023-01-01'), new Date('2023-01-02'));
    expect(result).toEqual([
      {
        hour: 1,
        date: '2023-01-01',
        revenue: 50,
        volume: 10,
        salesCount: 5,
        sales: 50
      }
    ]);
  });
});
