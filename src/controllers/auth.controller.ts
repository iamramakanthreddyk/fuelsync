import { Request, Response } from 'express';
import { Pool } from 'pg';
import { login } from '../services/auth.service';
import { errorResponse } from '../utils/errorResponse';

export function createAuthController(db: Pool) {
  return {
    login: async (req: Request, res: Response) => {
      const { email, password } = req.body as { email: string; password: string };
      const tenantId = req.headers['x-tenant-id'] as string | undefined;
      
      console.log(`[AUTH] Login attempt for email: ${email}, tenantId: ${tenantId || 'none'}`);
      
      try {
        // Check if user exists before attempting login
        let userExists = false;
        let userSchema = '';
        let foundTenantId = tenantId;
        
        // If no tenant ID is provided, try to find the tenant for this email
        if (!tenantId) {
          console.log(`[AUTH] No tenant ID provided, checking admin users first`);
          // First check if it's an admin user
          const adminCheck = await db.query(
            'SELECT id FROM public.admin_users WHERE email = $1',
            [email]
          );
          
          console.log(`[AUTH] Admin check result: ${adminCheck.rows.length} rows`);
          
          if (adminCheck.rows.length > 0) {
            console.log(`[AUTH] Found admin user: ${email}`);
            userExists = true;
            userSchema = 'public';
            foundTenantId = undefined; // Admin users don't have tenant ID
          } else {
            // Not an admin user, try to find in tenant schemas
            console.log(`[AUTH] User not found in public schema, checking tenant schemas for: ${email}`);
            
            // Get all tenant schemas
            const { rows: tenants } = await db.query('SELECT schema_name FROM public.tenants');
            console.log(`[AUTH] Found ${tenants.length} tenant schemas:`, tenants.map(t => t.schema_name));
            
            // Check each tenant schema for the user
            for (const tenant of tenants) {
              const schema = tenant.schema_name;
              try {
                const userCheck = await db.query(
                  `SELECT id FROM ${schema}.users WHERE email = $1`,
                  [email]
                );
                
                if (userCheck.rows.length > 0) {
                  userExists = true;
                  userSchema = schema;
                  foundTenantId = schema;
                  console.log(`[AUTH] Found user in tenant schema: ${schema}`);
                  break;
                }
              } catch (err: any) {
                console.error(`[AUTH] Error checking schema ${schema}:`, err?.message);
              }
            }
          }
        } else {
          // Tenant ID was provided, check if it exists
          const tenantCheck = await db.query(
            'SELECT name FROM public.tenants WHERE schema_name = $1',
            [tenantId]
          );
          
          if (tenantCheck.rows.length === 0) {
            console.log(`[AUTH] Tenant not found: ${tenantId}`);
            return errorResponse(res, 401, 'Tenant not found');
          }
          
          // Check if user exists in tenant schema
          const userCheck = await db.query(
            `SELECT id FROM ${tenantId}.users WHERE email = $1`,
            [email]
          );
          
          userExists = userCheck.rows.length > 0;
          userSchema = tenantId;
        }
        
        if (!userExists) {
          console.log(`[AUTH] User not found: ${email} in schema: ${userSchema}`);
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
        
        console.log(`[AUTH] Login successful for user: ${result.user.id}, role: ${result.user.role}`);
        return res.json(result);
      } catch (error: any) {
        console.error(`[AUTH] Login error:`, error);
        return errorResponse(res, 500, `Login error: ${error?.message || 'Unknown error'}`);
      }
    },
  };
}
