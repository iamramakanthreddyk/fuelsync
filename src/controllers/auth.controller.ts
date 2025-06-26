import { Request, Response } from 'express';
import { Pool } from 'pg';
import { login } from '../services/auth.service';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';

export function createAuthController(db: Pool) {
  return {
    login: async (req: Request, res: Response) => {
      const { email, password } = req.body as { email: string; password: string };
      const tenantId = req.headers['x-tenant-id'] as string | undefined;
      
      console.log(`[AUTH] Login attempt for email: ${email}, tenantId: ${tenantId || 'none'}`);
      
      try {
        // Check if user exists before attempting login
        let userExists = false;
        let foundTenantId = tenantId;
        
        // If no tenant ID is provided, try to find the tenant for this email
        if (!tenantId) {
      const adminCheck = await db.query(
        'SELECT id, email, role FROM public.admin_users WHERE email = $1',
        [email]
      );
          
          if (adminCheck.rows.length > 0) {
            userExists = true;
            foundTenantId = undefined; // Admin users don't have tenant ID
          } else {
            // Not an admin user, try to find in tenant schemas
            
            const res = await db.query(
              `SELECT u.tenant_id, t.name FROM public.users u JOIN public.tenants t ON u.tenant_id = t.id WHERE u.email = $1`,
              [email]
            );
            if (res.rows.length === 1) {
              userExists = true;
              foundTenantId = res.rows[0].tenant_id;
            } else if (res.rows.length > 1) {
              console.log('[AUTH] Multiple tenants found for user, tenant header required');
            }
          }
        } else {
          // Tenant ID was provided, check if it exists
          const tenantCheck = await db.query(
            'SELECT id, name FROM public.tenants WHERE id = $1',
            [tenantId]
          );

          if (tenantCheck.rows.length === 0) {
            console.log(`[AUTH] Tenant not found: ${tenantId}`);
            return errorResponse(res, 401, 'Tenant not found');
          }

          // Check if user exists in tenant schema
          const tenantUuid = tenantCheck.rows[0].id;
          const userCheck = await db.query(
            'SELECT id FROM public.users WHERE tenant_id = $1 AND email = $2',
            [tenantUuid, email]
          );

          userExists = userCheck.rows.length > 0;
        }

        if (!userExists) {
          console.log(`[AUTH] User not found: ${email} for tenant: ${foundTenantId}`);
          return errorResponse(res, 401, `User not found: ${email}`);
        }
        
        // Attempt login with the found tenant ID
        const result = foundTenantId ? 
          await login(db, email, password, foundTenantId) : 
          await login(db, email, password);
        
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
    logout: async (_req: Request, res: Response) => {
      try {
        successResponse(res, { message: 'Logged out successfully' });
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
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '24h' }
        );

        successResponse(res, { token, user });
      } catch (error: any) {
        return errorResponse(res, 500, error.message);
      }
    },
  };
}
