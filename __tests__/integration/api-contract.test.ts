import request from 'supertest';
import { createApp } from '../../src/app';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

describe('API contract', () => {
  const app = createApp();
  const specPath = path.resolve(__dirname, '../../docs/openapi.yaml');
  const doc = yaml.load(fs.readFileSync(specPath, 'utf8')) as any;

  for (const [route, methods] of Object.entries<any>(doc.paths || {})) {
    for (const [method] of Object.entries<any>(methods)) {
      test(`${method.toUpperCase()} ${route} responds`, async () => {
        const url = `/api/v1${route.replace(/\{[^}]+\}/g, 'test')}`;
        const req = (request(app) as any)[method](url);
        const res = method === 'get' ? await req : await req.send({});
        expect(res.status).not.toBe(404);
      });
    }
  }
});

