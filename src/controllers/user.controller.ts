import { Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { errorResponse } from '../utils/errorResponse';

export function createUserHandlers(db: Pool) {
  return {
    // List users for the current tenant
    list: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user?.tenantId) {
          return errorResponse(res, 400, 'Tenant context is required');
        }

        const users = await prisma.user.findMany({
          where: { tenant_id: user.tenantId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            created_at: true
          },
          orderBy: { created_at: 'desc' }
        });

        res.json({ users });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    // Get user by ID
    get: async (req: Request, res: Response) => {
      try {
        const auth = req.user;
        if (!auth?.tenantId) {
          return errorResponse(res, 400, 'Tenant context is required');
        }

        const userId = req.params.userId;
        const userRecord = await prisma.user.findFirst({
          where: { id: userId, tenant_id: auth.tenantId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            created_at: true
          }
        });

        if (!userRecord) {
          return errorResponse(res, 404, 'User not found');
        }

        res.json({ data: userRecord });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    // Create a new user
    create: async (req: Request, res: Response) => {
      try {
        const auth = req.user;
        if (!auth?.tenantId) {
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
        const existingUser = await prisma.user.findFirst({
          where: { tenant_id: auth.tenantId, email }
        });

        if (existingUser) {
          return errorResponse(res, 400, 'Email already in use');
        }

        const tenantId = auth.tenantId;
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create user
        const newUser = await prisma.user.create({
          data: {
            tenant_id: tenantId,
            email,
            password_hash: passwordHash,
            name,
            role
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            created_at: true
          }
        });

        res.status(201).json(newUser);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    // Update user
    update: async (req: Request, res: Response) => {
      try {
        const auth = req.user;
        if (!auth?.tenantId) {
          return errorResponse(res, 400, 'Tenant context is required');
        }
        
        const userId = req.params.userId;
        const { name, role } = req.body;
        
        // Validate input
        if (!name && !role) {
          return errorResponse(res, 400, 'At least one field to update is required');
        }
        
        // Validate role if provided
        if (role && !['owner', 'manager', 'attendant'].includes(role)) {
          return errorResponse(res, 400, 'Role must be owner, manager, or attendant');
        }
        
        const updated = await prisma.user.updateMany({
          where: { id: userId, tenant_id: auth.tenantId },
          data: {
            ...(name ? { name } : {}),
            ...(role ? { role } : {})
          }
        });

        if (!updated.count) {
          return errorResponse(res, 404, 'User not found');
        }

        const userRecord = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            created_at: true
          }
        });

        res.json({ data: userRecord });
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
        
        const userId = req.params.userId;
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
        
        const userId = req.params.userId;
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
        
        const userId = req.params.userId;
        
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