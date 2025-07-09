import { getPriceAtTimestamp } from '../src/utils/priceUtils';

describe('priceUtils.getPriceAtTimestamp', () => {
  test('returns price record from db', async () => {
    const now = new Date();
    const prisma = {
      fuelPrice: {
        findFirst: jest.fn().mockResolvedValue({ price: 95.5, valid_from: now })
      }
    } as any;
    const record = await getPriceAtTimestamp(prisma, 't1', 's1', 'petrol', now);
    expect(record).toEqual({ price: 95.5, validFrom: now });
  });
});
