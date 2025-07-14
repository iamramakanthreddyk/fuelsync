import { createNozzleReadingHandlers } from '../src/controllers/nozzleReading.controller';

describe('nozzleReading.controller.voidReading', () => {
  const db = { connect: jest.fn(), query: jest.fn() } as any;
  const handlers = createNozzleReadingHandlers(db);
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('forbids attendants from voiding readings', async () => {
    const req = {
      user: { tenantId: 't1', userId: 'u1', role: 'attendant' },
      params: { id: 'r1' },
      body: { reason: 'bad' },
    } as any;

    await handlers.voidReading(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Only managers and owners can void readings',
    });
  });

  test('allows manager to void readings', async () => {
    (db.connect as jest.Mock).mockResolvedValue({
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'r1', nozzle_id: 'n', reading: 1, recorded_at: new Date() }] })
        .mockResolvedValueOnce({ rowCount: 0 }) // sales
        .mockResolvedValueOnce(undefined) // audit
        .mockResolvedValueOnce(undefined) // update reading
        .mockResolvedValueOnce(undefined), // COMMIT
      release: jest.fn(),
    });

    const req = {
      user: { tenantId: 't1', userId: 'u1', role: 'manager' },
      params: { id: 'r1' },
      body: { reason: 'bad' },
    } as any;

    await handlers.voidReading(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 'r1', status: 'voided' } });
  });
});
