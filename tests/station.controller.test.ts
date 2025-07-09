import { createStationHandlers } from '../src/controllers/station.controller';
import { createStation } from '../src/services/station.service';

jest.mock('../src/services/station.service', () => ({
  createStation: jest.fn()
}));

jest.mock('../src/validators/station.validator', () => ({
  validateCreateStation: jest.fn().mockImplementation((d: any) => d)
}));

const db = {} as any;
const handlers = createStationHandlers(db);

const res = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
} as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('station.controller.create', () => {
  test('returns 400 without tenant context', async () => {
    const req = { user: {}, body: { name: 'Test' } } as any;
    await handlers.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });

  test('calls service and returns 201', async () => {
    (createStation as jest.Mock).mockResolvedValue('s1');
    const req = { user: { tenantId: 't1' }, body: { name: 'Test', address: 'A' } } as any;
    await handlers.create(req, res);
    expect(createStation).toHaveBeenCalledWith(db, 't1', 'Test', 'A');
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
