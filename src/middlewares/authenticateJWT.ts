// Types handled by TypeScript compilation
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserRole } from '../constants/auth';
import { ExtendedUser } from '../types/auth';

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ status: 'error', code: 'AUTH_REQUIRED', message: 'Missing token' });
  }
  const token = header.replace('Bearer ', '');
  try {
    const payload = verifyToken(token);
    // Create ExtendedUser object with compatibility
    const extendedUser: ExtendedUser = {
      ...payload,
      id: payload.userId, // Add id for compatibility
      email: '', // Will be populated by other middleware if needed
      tenantId: payload.tenantId || '', // Ensure string type
      name: undefined,
      planName: undefined
    };
    (req as any).user = extendedUser;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
  }
}
