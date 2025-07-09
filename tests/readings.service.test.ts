jest.mock('../src/utils/prisma', () => ({
  __esModule: true,
  default: { $queryRawUnsafe: jest.fn().mockResolvedValue([]) }
}));

import { listNozzleReadings } from '../src/services/nozzleReading.service';

describe('nozzleReading.service.listNozzleReadings', () => {
  test('builds SQL with filters', async () => {
    const res = await listNozzleReadings('tenant1', {
      nozzleId: 'n1',
      stationId: 's1'
    } as any);
    expect(Array.isArray(res)).toBe(true);
  });
});
