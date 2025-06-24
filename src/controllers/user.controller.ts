import { Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { errorResponse } from '../utils/errorResponse';

export function createUserHandlers(db: Pool) {
  return {
    // List users for the current tenant
    list: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) {
          return errorResponse(res, 400, 'Tenant context is required');
        }
        
        const result = await db.query(
          `SELECT id, email, name, role, created_at FROM ${schemaName}.users ORDER BY created_at DESC`
        );
        
        res.json({ users: result.rows });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    // Get user by ID
    get: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) {
          return errorResponse(res, 400, 'Tenant context is required');
        }
        
        const userId = req.params.id;
        const result = await db.query(
          `SELECT id, email, name, role, created_at FROM ${schemaName}.users WHERE id = $1`,
          [userId]
        );
        
        if (result.rows.length === 0) {
          return errorResponse(res, 404, 'User not found');
        }
        
        res.json(result.rows[0]);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    // Create a new user
    create: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) {
          return errorResponse(res, 400, 'Tenant context is required');
        }
        
        const { email, password, name, role } = req.body;
        
        // Validate input
        if (!email || !password || !name || !role) {
          return errorResponse(res, 400, 'Email, password, name, and role are required');
        }
        
        // Validate role
        if (!['owner', 'manager', 'attendant'].includes(role)) {
          return errorResponse(res, 400, 'Role must be owner, manager, or attendant');
        }
        
        // Check if email already exists
        const existingUser = await db.query(
          `SELECT id FROM ${schemaName}.users WHERE email = $1`,
          [email]
        );
        
        if (existingUser.rows.length > 0) {
          return errorResponse(res, 400, 'Email already in use');
        }
        
        // Get tenant ID
        const tenantResult = await db.query(
          'SELECT id FROM public.tenants WHERE schema_name = $1',
          [schemaName]
        );
        
        if (tenantResult.rows.length === 0) {
          return errorResponse(res, 400, 'Tenant not found');
        }
        
        const tenantId = tenantResult.rows[0].id;
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create user
        const result = await db.query(
          `INSERT INTO ${schemaName}.users (tenant_id, email, password_hash, name, role) 
           VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, created_at`,
          [tenantId, email, passwordHash, name, role]
        );
        
        res.status(201).json(result.rows[0]);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    // Update user
    update: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) {
          return errorResponse(res, 400, 'Tenant context is required');
        }
        
        const userId = req.params.id;
        const { name, role } = req.body;
        
        // Validate input
        if (!name && !role) {
          return errorResponse(res, 400, 'At least one field to update is required');
        }
        
        // Validate role if provided
        if (role && !['owner', 'manager', 'attendant'].includes(role)) {
          return errorResponse(res, 400, 'Role must be owner, manager, or attendant');
        }
        
        // Build update query
        let query = `UPDATE ${schemaName}.users SET `;
        const params: any[] = [];
        const updates: string[] = [];
        
        if (name) {
          params.push(name);
          updates.push(`name = $${params.length}`);
        }
        
        if (role) {
          params.push(role);
          updates.push(`role = $${params.length}`);
        }
        
        params.push(userId);
        query += updates.join(', ') + ` WHERE id = $${params.length} RETURNING id, email, name, role, created_at`;
        
        const result = await db.query(query, params);
        
        if (result.rows.length === 0) {
          return errorResponse(res, 404, 'User not found');
        }
        
        res.json(result.rows[0]);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    // Change password
    changePassword: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) {
          return errorResponse(res, 400, 'Tenant context is required');
        }
        
        const userId = req.params.id;
        const { currentPassword, newPassword } = req.body;
        
        // Validate input
        if (!currentPassword || !newPassword) {
          return errorResponse(res, 400, 'Current password and new password are required');
        }
        
        // Get user
        const userResult = await db.query(
          `SELECT password_hash FROM ${schemaName}.users WHERE id = $1`,
          [userId]
        );
        
        if (userResult.rows.length === 0) {
          return errorResponse(res, 404, 'User not found');
        }
        
        // Verify current password
        const passwordHash = userResult.rows[0].password_hash;
        const isPasswordValid = await bcrypt.compare(currentPassword, passwordHash);
        
        if (!isPasswordValid) {
          return errorResponse(res, 400, 'Current password is incorrect');
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await db.query(
          `UPDATE ${schemaName}.users SET password_hash = $1 WHERE id = $2`,
          [newPasswordHash, userId]
        );
        
        res.json({ success: true, message: 'Password changed successfully' });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    // Reset password (for admin/owner)
    resetPassword: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) {
          return errorResponse(res, 400, 'Tenant context is required');
        }
        
        const userId = req.params.id;
        const { newPassword } = req.body;
        
        // Validate input
        if (!newPassword) {
          return errorResponse(res, 400, 'New password is required');
        }
        
        // Check if user exists
        const userResult = await db.query(
          `SELECT id FROM ${schemaName}.users WHERE id = $1`,
          [userId]
        );
        
        if (userResult.rows.length === 0) {
          return errorResponse(res, 404, 'User not found');
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await db.query(
          `UPDATE ${schemaName}.users SET password_hash = $1 WHERE id = $2`,
          [newPasswordHash, userId]
        );
        
        res.json({ success: true, message: 'Password reset successfully' });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    // Delete user
    delete: async (req: Request, res: Response) => {
      try {
        const schemaName = (req as any).schemaName;
        if (!schemaName) {
          return errorResponse(res, 400, 'Tenant context is required');
        }
        
        const userId = req.params.id;
        
        // Check if user is the last owner
        const ownerResult = await db.query(
          `SELECT COUNT(*) FROM ${schemaName}.users WHERE role = 'owner'`
        );
        
        const ownerCount = parseInt(ownerResult.rows[0].count);
        
        if (ownerCount <= 1) {
          // Check if this user is an owner
          const isOwnerResult = await db.query(
            `SELECT role FROM ${schemaName}.users WHERE id = $1`,
            [userId]
          );
          
          if (isOwnerResult.rows.length > 0 && isOwnerResult.rows[0].role === 'owner') {
            return errorResponse(res, 400, 'Cannot delete the last owner');
          }
        }
        
        // Delete user
        const result = await db.query(
          `DELETE FROM ${schemaName}.users WHERE id = $1 RETURNING id`,
          [userId]
        );
        
        if (result.rows.length === 0) {
          return errorResponse(res, 404, 'User not found');
        }
        
        res.json({ success: true, message: 'User deleted successfully' });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}