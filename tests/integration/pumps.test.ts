import fs from 'fs';
import yaml from 'js-yaml';
import request from 'supertest';
import dotenv from 'dotenv';
import { createApp } from '../../src/app';
import { generateToken } from '../../src/utils/jwt';
import { UserRole } from '../../src/constants/auth';
import pool from '../../src/utils/db';

dotenv.config({ path: '.env.test' });

const spec: any = yaml.load(fs.readFileSync('docs/openapi.yaml', 'utf8'));
const app = createApp();

const tokens: Record<string, string> = {
  owner: generateToken({ userId: 'o1', role: UserRole.Owner, tenantId: 't1' }),
  manager: generateToken({ userId: 'm1', role: UserRole.Manager, tenantId: 't1' }),
  attendant: generateToken({ userId: 'a1', role: UserRole.Attendant, tenantId: 't1' }),
};

interface Endpoint {
  method: string;
  path: string;
  allowed: string[];
}

const endpoints: Endpoint[] = [
  { method: 'get', path: '/pumps?stationId=s1', allowed: ['owner', 'manager'] },
  { method: 'post', path: '/pumps', allowed: ['owner'] },
  { method: 'get', path: '/pumps/{pumpId}', allowed: ['owner', 'manager'] },
];

const summary = { endpoints: endpoints.length, tests: 0, failed: 0 };

describe('Pumps API RBAC', () => {
  endpoints.forEach(({ method, path, allowed }) => {
    const url = '/api/v1' + path.replace('{pumpId}', 'p1');

    ['owner', 'manager', 'attendant'].forEach(role => {
      const shouldAllow = allowed.includes(role);
      summary.tests++;
      test(`${role} ${method.toUpperCase()} ${path}`, async () => {
        const res = await (request(app) as any)[method](url)
          .set('Authorization', `Bearer ${tokens[role]}`)
          .set('x-tenant-id', 't1');
        if (shouldAllow) {
          expect([200,201,204]).toContain(res.status);
        } else {
          expect([401,403]).toContain(res.status);
        }
      });
    });

    summary.tests++;
    test(`unauthenticated ${method.toUpperCase()} ${path}`, async () => {
      const res = await (request(app) as any)[method](url)
        .set('x-tenant-id', 't1');
      expect([401,403]).toContain(res.status);
    });
  });

  afterAll(async () => {
    await pool.end().catch(() => {});
    console.log(`\n# Pumps Test Summary\n- Endpoints tested: ${summary.endpoints}\n- Total tests defined: ${summary.tests}\n`);
  });
});
