jest.mock('../src/utils/prisma', () => ({
  __esModule: true,
  default: { $queryRawUnsafe: jest.fn().mockResolvedValue([]) }
}));

import prisma from '../src/utils/prisma';
import { listNozzleReadings } from '../src/services/nozzleReading.service';

describe('nozzleReading.service.listNozzleReadings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('builds SQL with filters', async () => {
    const res = await listNozzleReadings('tenant1', {
      nozzleId: 'n1',
      stationId: 's1'
    } as any);

    expect(Array.isArray(res)).toBe(true);
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('nr.tenant_id = $1'),
      'tenant1',
      'n1',
      's1'
    );
  });

  test('throws on invalid tenant ID', async () => {
    await expect(listNozzleReadings('', {} as any)).rejects.toThrow('Invalid tenant ID');
  });

  test('applies limit clause when provided', async () => {
    await listNozzleReadings('tenant1', { limit: 5 } as any);
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT 5'),
      'tenant1'
    );
  });
});
