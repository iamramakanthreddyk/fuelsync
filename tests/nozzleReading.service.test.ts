import { voidNozzleReading } from '../src/services/nozzleReading.service';

describe('voidNozzleReading', () => {
  test('creates audit log and voids related sales', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'r1', nozzle_id: 'n', reading: 1, recorded_at: new Date() }] })
        .mockResolvedValueOnce({ rowCount: 2 }) // sales
        .mockResolvedValueOnce({ rowCount: 1 }) // user exists
        .mockResolvedValueOnce(undefined) // audit log
        .mockResolvedValueOnce(undefined) // void reading
        .mockResolvedValueOnce(undefined) // void sales
        .mockResolvedValueOnce(undefined), // COMMIT
      release: jest.fn(),
    } as any;

    const db = { connect: jest.fn().mockResolvedValue(client) } as any;

    const result = await voidNozzleReading(db, 't1', 'r1', 'bad', 'u1');

    expect(result).toEqual({ id: 'r1', status: 'voided' });
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.reading_audit_log'),
      ['t1', 'r1', 'bad', 'u1']
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE public.sales SET status'),
      ['voided', 'r1', 't1']
    );
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
  });
});
