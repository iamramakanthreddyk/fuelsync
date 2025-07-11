import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createUserHandlers } from '../controllers/user.controller';

export function createUserRouter(db: Pool) {
  const router = Router();
  const handlers = createUserHandlers(db);
  
  // Middleware to ensure proper roles
  const requireOwnerOrManagerOrSuperAdmin = requireRole([UserRole.Owner, UserRole.Manager, UserRole.SuperAdmin]);
  const requireOwnerOrSuperAdmin = requireRole([UserRole.Owner, UserRole.SuperAdmin]);
  
  // List users
  router.get('/', authenticateJWT, requireOwnerOrManagerOrSuperAdmin, handlers.list);
  
  // Get user by ID
  router.get('/:userId', authenticateJWT, requireOwnerOrManagerOrSuperAdmin, handlers.get);
  
  // Create user
  router.post('/', authenticateJWT, requireOwnerOrSuperAdmin, handlers.create);
  
  // Update user
  router.put('/:userId', authenticateJWT, requireOwnerOrSuperAdmin, handlers.update);
  
  // Change password (user can change their own password)
  router.post('/:userId/change-password', authenticateJWT, handlers.changePassword);
  
  // Reset password
  router.post('/:userId/reset-password', authenticateJWT, requireOwnerOrSuperAdmin, handlers.resetPassword);
  
  // Delete user
  router.delete('/:userId', authenticateJWT, requireOwnerOrSuperAdmin, handlers.delete);
  
  return router;
}