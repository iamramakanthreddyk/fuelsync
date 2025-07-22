import fs from 'fs';
import yaml from 'js-yaml';
import request from 'supertest';
import { createApp } from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { UserRole } from '../src/constants/auth';

const spec: any = yaml.load(fs.readFileSync('docs/openapi.yaml', 'utf8'));
const app = createApp();

const tokens: Record<string, string> = {
  owner: generateToken({ userId: 'o1', role: UserRole.Owner, tenantId: 't1' }),
  manager: generateToken({ userId: 'm1', role: UserRole.Manager, tenantId: 't1' }),
  attendant: generateToken({ userId: 'a1', role: UserRole.Attendant, tenantId: 't1' }),
};

describe('OpenAPI RBAC enforcement', () => {
  for (const [path, methods] of Object.entries<any>(spec.paths)) {
    for (const [method, op] of Object.entries<any>(methods)) {
      const roles: string[] | undefined = op['x-roles'];
      if (!roles) continue;
      const url = '/api/v1' + path.replace(/\{[^}]+\}/g, 'test');
      test(`${method.toUpperCase()} ${path} unauthenticated`, async () => {
        const res = await (request(app) as any)[method](url);
        expect([401, 403]).toContain(res.status);
      });
      const roleList = ['owner', 'manager', 'attendant'];
      roleList.forEach(r => {
        const expected = roles.includes(r);
        test(`${method.toUpperCase()} ${path} role ${r}`, async () => {
          const res = await (request(app) as any)[method](url)
            .set('Authorization', `Bearer ${tokens[r]}`);
          if (expected) {
            expect(res.status).not.toBe(403);
          } else {
            expect(res.status).toBe(403);
          }
        });
      });
    }
  }
});
