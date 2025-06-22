import { getPriceAtTimestamp } from '../src/utils/priceUtils';

describe('priceUtils.getPriceAtTimestamp', () => {
  test('returns price from db', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rows: [{ price: 95.5 }] }) } as any;
    const price = await getPriceAtTimestamp(db, 't1', 's1', 'petrol', new Date());
    expect(price).toBe(95.5);
  });
});
