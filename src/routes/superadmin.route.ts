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

  // Test route
  router.get('/test', (req, res) => {
    console.log('[SUPERADMIN-ROUTER] Test route hit');
    res.json({ message: 'Superadmin router working' });
  });

  // Tenant Management
  router.get('/tenants', ...requireSuperAdmin, handlers.getAllTenants);
  router.get('/tenants/:tenantId', ...requireSuperAdmin, handlers.getTenantDetails);
  router.post('/tenants/:tenantId/assign-plan', ...requireSuperAdmin, handlers.assignPlan);
  router.patch('/tenants/:tenantId/plan', (req, res, next) => {
    console.log('[SUPERADMIN-ROUTER] Plan update route hit:', req.params, req.body);
    next();
  }, ...requireSuperAdmin, (req, res) => {
    console.log('[SUPERADMIN-ROUTER] Handler called');
    if (handlers.updateTenantPlan) {
      return handlers.updateTenantPlan(req, res);
    } else {
      console.log('[SUPERADMIN-ROUTER] updateTenantPlan handler not found');
      return res.status(500).json({ error: 'Handler not implemented' });
    }
  });
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

  // Catch-all for debugging
  router.all('*', (req, res) => {
    console.log('[SUPERADMIN-ROUTER] Unmatched route:', req.method, req.path);
    res.status(404).json({ error: 'Route not found in superadmin router', method: req.method, path: req.path });
  });

  return router;
}
