import fs from 'fs';
import yaml from 'js-yaml';
import request from 'supertest';
import dotenv from 'dotenv';
import { createApp } from '../../src/app';
import { generateToken } from '../../src/utils/jwt';
import { UserRole } from '../../src/constants/auth';
import pool from '../../src/utils/db';

dotenv.config({ path: '.env.test' });

jest.setTimeout(30000);

const spec: any = yaml.load(fs.readFileSync('docs/openapi.yaml', 'utf8'));
const app = createApp();

const tenantId = '00000000-0000-0000-0000-000000000000';
const tokens: Record<string, string> = {
  owner: generateToken({ userId: 'o1', role: UserRole.Owner, tenantId }),
  manager: generateToken({ userId: 'm1', role: UserRole.Manager, tenantId }),
  attendant: generateToken({ userId: 'a1', role: UserRole.Attendant, tenantId }),
};

const path = '/todays-sales/summary';

describe('Todays Sales API RBAC', () => {
  ['owner', 'manager', 'attendant'].forEach(role => {
    test(`${role} GET ${path}`, async () => {
      const res = await request(app)
        .get('/api/v1' + path)
        .set('Authorization', `Bearer ${tokens[role]}`)
        .set('x-tenant-id', tenantId);
      expect([200,400,404]).toContain(res.status);
    });
  });

  test(`unauthenticated GET ${path}`, async () => {
    const res = await request(app)
      .get('/api/v1' + path)
      .set('x-tenant-id', tenantId);
    expect([401,403]).toContain(res.status);
  });

  afterAll(async () => {
    await pool.end().catch(() => {});
  });
});

