import { Request, Response } from 'express';
import { Pool } from 'pg';
import { login, loginSuperAdmin } from '../services/auth.service';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { JWT_SECRET, REFRESH_TOKEN_EXPIRES_IN } from '../constants/auth';
import { testConnection } from '../utils/db';

export function createAuthController(db: Pool) {
  return {
    login: async (req: Request, res: Response) => {
      const { email, password } = req.body as { email: string; password: string };

      console.log(`[AUTH] Login attempt for email: ${email}`);

      try {
        const dbCheck = await testConnection();
        if (dbCheck.success) {
          console.log('[AUTH] Database connection verified', {
            time: dbCheck.time,
            database: dbCheck.database,
            pool: dbCheck.poolStats,
          });
        } else {
          console.error('[AUTH] Database connection test failed', dbCheck);
        }
      } catch (connErr) {
        console.error('[AUTH] Error testing database connection', connErr);
      }

      try {
        // Determine if this is an admin user
        const adminCheck = await db.query(
          'SELECT id FROM public.admin_users WHERE email = $1',
          [email]
        );

        let result;

        if (adminCheck.rows.length > 0) {
          // Super admin login
          result = await loginSuperAdmin(db, email, password);
        } else {
          // Look up tenant by email
          const userRes = await db.query(
            'SELECT tenant_id FROM public.users WHERE email = $1',
            [email]
          );

          if (userRes.rows.length === 0) {
            console.log(`[AUTH] User not found: ${email}`);
            return errorResponse(res, 401, `User not found: ${email}`);
          }

          const tenantUuid = userRes.rows[0].tenant_id;
          result = await login(db, email, password, tenantUuid);
        }

        if (!result) {
          console.log(`[AUTH] Login failed for email: ${email} (password mismatch)`);
          return errorResponse(res, 401, 'Invalid password');
        }

        return successResponse(res, result);
        
        if (!result) {
          console.log(`[AUTH] Login failed for email: ${email} (password mismatch)`);
          return errorResponse(res, 401, 'Invalid password');
        }
        
        return successResponse(res, result);
      } catch (error: any) {
        console.error(`[AUTH] Login error:`, error);
        return errorResponse(res, 500, `Login error: ${error?.message || 'Unknown error'}`);
      }
    },
    adminLogin: async (req: Request, res: Response) => {
      const { email, password } = req.body as { email: string; password: string };
      console.log(`[AUTH] Admin login attempt for email: ${email}`);

      try {
        const result = await loginSuperAdmin(db, email, password);
        if (!result) {
          console.log(`[AUTH] Admin login failed for email: ${email}`);
          return errorResponse(res, 401, 'Invalid admin credentials');
        }

        return successResponse(res, result);
      } catch (error: any) {
        console.error(`[AUTH] Admin login error:`, error);
        return errorResponse(res, 500, `Login error: ${error?.message || 'Unknown error'}`);
      }
    },
    logout: async (_req: Request, res: Response) => {
      try {
        successResponse(res, {}, 'Logged out successfully');
      } catch (error: any) {
        return errorResponse(res, 500, error.message);
      }
    },
    refreshToken: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user) {
          return errorResponse(res, 401, 'Invalid token');
        }
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          {
            userId: user.userId,
            tenantId: user.tenantId,
            role: user.role
          },
          JWT_SECRET,
          { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
        );

        let tenantName: string | undefined = undefined;
        if (user.tenantId) {
          const tRes = await db.query('SELECT name FROM public.tenants WHERE id = $1', [user.tenantId]);
          tenantName = tRes.rows[0]?.name;
        }

        successResponse(res, { token, user: { ...user, tenantName } });
      } catch (error: any) {
        return errorResponse(res, 500, error.message);
      }
    },
  };
}
