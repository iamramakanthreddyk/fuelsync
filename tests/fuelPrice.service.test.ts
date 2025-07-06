import { createFuelPrice } from '../src/services/fuelPrice.service';

describe('fuelPrice.service.createFuelPrice', () => {
  test('throws error when range overlaps existing record', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // update
        .mockRejectedValueOnce(new Error('range conflict')),
      release: jest.fn(),
    } as any;
    const db = { connect: jest.fn().mockResolvedValue(client) } as any;

    await expect(
      createFuelPrice(db, 't1', {
        stationId: 's1',
        fuelType: 'petrol',
        price: 1,
        validFrom: new Date('2024-06-01'),
      })
    ).rejects.toThrow('range conflict');
  });

  test('closes open range when new price added', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // update open range
        .mockResolvedValueOnce({ rows: [{ id: 'p2' }] }) // insert
        .mockResolvedValueOnce(undefined), // COMMIT
      release: jest.fn(),
    } as any;
    const db = { connect: jest.fn().mockResolvedValue(client) } as any;

    const id = await createFuelPrice(db, 't1', {
      stationId: 's1',
      fuelType: 'petrol',
      price: 1.5,
      validFrom: new Date('2024-07-01'),
    });

    expect(id).toBe('p2');
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE public.fuel_prices'),
      [new Date('2024-07-01'), 't1', 's1', 'petrol']
    );
  });
});
