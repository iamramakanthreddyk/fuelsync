import bcrypt from 'bcrypt';
import { login } from '../src/services/auth.service';

jest.mock('../src/utils/jwt', () => ({
  generateToken: () => 'signed-token',
}));

describe('auth.service.login', () => {
  test('returns null when no user', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rows: [] }) } as any;
    const token = await login(db, 'a@test.com', 'pw', 'tenant1');
    expect(token).toBeNull();
  });

  test('returns token when password matches', async () => {
    const hash = await bcrypt.hash('pw', 1);
    const db = { query: jest.fn().mockResolvedValue({ rows: [{ id: '1', password_hash: hash, role: 'manager' }] }) } as any;
    const token = await login(db, 'a@test.com', 'pw', 'tenant1');
    expect(token).toBe('signed-token');
  });
});
