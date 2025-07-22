import fs from 'fs';
import yaml from 'js-yaml';
import request from 'supertest';
import dotenv from 'dotenv';
import { createApp } from '../../src/app';
import { generateToken } from '../../src/utils/jwt';
import { UserRole } from '../../src/constants/auth';
import pool from '../../src/utils/db';

jest.setTimeout(30000);

dotenv.config({ path: '.env.test' });

const spec: any = yaml.load(fs.readFileSync('docs/openapi.yaml', 'utf8'));
const app = createApp();

const tenantId = '00000000-0000-0000-0000-000000000000';
const tokens: Record<string, string> = {
  owner: generateToken({ userId: 'o1', role: UserRole.Owner, tenantId }),
  manager: generateToken({ userId: 'm1', role: UserRole.Manager, tenantId }),
  attendant: generateToken({ userId: 'a1', role: UserRole.Attendant, tenantId }),
};

const validStationId = '11111111-1111-1111-1111-111111111111';

type Endpoint = { method: string; path: string; allowed: string[] };

// Station endpoints derived from routes & spec
const endpoints: Endpoint[] = [
  { method: 'get', path: '/stations', allowed: ['owner', 'manager'] },
  { method: 'get', path: '/stations/{stationId}', allowed: ['owner', 'manager'] },
  { method: 'get', path: '/stations/compare', allowed: ['owner'] },
  { method: 'get', path: '/stations/ranking', allowed: ['owner'] },
  { method: 'get', path: '/stations/{stationId}/metrics', allowed: ['owner', 'manager'] },
  { method: 'get', path: '/stations/{stationId}/performance', allowed: ['owner', 'manager'] },
  { method: 'get', path: '/stations/{stationId}/efficiency', allowed: ['owner', 'manager'] },
];

const summary = { endpoints: endpoints.length, tests: 0, failed: 0 };

describe('Stations API RBAC', () => {
  endpoints.forEach(({ method, path, allowed }) => {
    const url = '/api/v1' + path.replace('{stationId}', validStationId);

    ['owner', 'manager', 'attendant'].forEach(role => {
      const shouldAllow = allowed.includes(role);
      summary.tests++;
      test(`${role} ${method.toUpperCase()} ${path}`, async () => {
        const res = await (request(app) as any)[method](url)
          .set('Authorization', `Bearer ${tokens[role]}`)
          .set('x-tenant-id', tenantId);
        if (shouldAllow) {
          expect([200,201,204,400,404]).toContain(res.status);
        } else {
          expect([401,403]).toContain(res.status);
        }
      });
    });

    summary.tests++;
    test(`unauthenticated ${method.toUpperCase()} ${path}`, async () => {
      const res = await (request(app) as any)[method](url)
        .set('x-tenant-id', tenantId);
      expect([401,403]).toContain(res.status);
    });
  });

  afterAll(async () => {
    await pool.end().catch(() => {});
    console.log(`\n# Test Summary\n- Endpoints tested: ${summary.endpoints}\n- Total tests defined: ${summary.tests}\n`);
  });
});
