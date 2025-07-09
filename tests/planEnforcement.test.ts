import { beforeCreatePump } from '../src/middlewares/planEnforcement';

describe('planEnforcement.beforeCreatePump', () => {
  test('allows pump creation when under limit', async () => {
    const client = {
      tenant: { findFirst: jest.fn().mockResolvedValue({ plan_id: '00000000-0000-0000-0000-000000000002' }) },
      pump: { count: jest.fn().mockResolvedValue(3) },
    } as any;

    await expect(beforeCreatePump(client, 't1', 's1')).resolves.not.toThrow();
  });

  test('throws error when pump limit reached', async () => {
    const client = {
      tenant: { findFirst: jest.fn().mockResolvedValue({ plan_id: '00000000-0000-0000-0000-000000000002' }) },
      pump: { count: jest.fn().mockResolvedValue(8) },
    } as any;

    await expect(beforeCreatePump(client, 't1', 's1')).rejects.toThrow('Plan limit exceeded');
  });
});
