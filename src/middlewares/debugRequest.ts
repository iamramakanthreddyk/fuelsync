import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to debug request details
 */
export function debugRequest(req: Request, _res: Response, next: NextFunction) {
  console.log('==== DEBUG REQUEST ====');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  const headers = { ...req.headers } as any;
  if (headers.authorization) {
    headers.authorization = '***';
  }
  console.log('Headers:', JSON.stringify(headers, null, 2));
  console.log('Tenant ID:', req.headers['x-tenant-id']);
  console.log('==== END DEBUG ====');
  next();
}