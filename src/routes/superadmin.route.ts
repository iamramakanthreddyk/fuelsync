/**
 * @file routes/superadmin.route.ts
 * @description SuperAdmin routes for tenant and plan management
 */
import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateJWT } from '../middlewares/authenticateJWT';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../constants/auth';
import { createSuperAdminHandlers } from '../controllers/superadmin.controller';

export function createSuperAdminRouter(db: Pool) {
  const router = Router();
  const handlers = createSuperAdminHandlers(db);

  // All routes require SuperAdmin role
  const requireSuperAdmin = [authenticateJWT, requireRole([UserRole.SuperAdmin])];

  // Tenant Management
  router.get('/tenants', ...requireSuperAdmin, handlers.getAllTenants);
  router.post('/tenants/:tenantId/assign-plan', ...requireSuperAdmin, handlers.assignPlan);
  router.patch('/tenants/:tenantId/status', ...requireSuperAdmin, handlers.toggleTenantStatus);

  // Plan Management
  router.get('/plans', ...requireSuperAdmin, handlers.getPlans);
  router.post('/plans', ...requireSuperAdmin, handlers.createPlan);
  router.put('/plans/:planId', ...requireSuperAdmin, handlers.updatePlan);
  router.get('/plans/comparison', ...requireSuperAdmin, handlers.getPlanComparison);

  // User Management
  router.get('/users', ...requireSuperAdmin, handlers.getAllUsers);
  router.post('/users/reset-password', ...requireSuperAdmin, handlers.resetUserPassword);

  // Analytics & Monitoring
  router.get('/analytics/usage', ...requireSuperAdmin, handlers.getUsageAnalytics);
  router.get('/analytics/tenant/:tenantId', ...requireSuperAdmin, handlers.getTenantAnalytics);

  return router;
}
