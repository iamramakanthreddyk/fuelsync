import { Request, Response } from 'express';
import { Pool } from 'pg';
import { errorResponse } from '../utils/errorResponse';
import * as tenantService from '../services/tenant.service';
import * as planService from '../services/plan.service';
import * as adminService from '../services/admin.service';

export function createAdminApiHandlers(db: Pool) {
  return {
    // Tenant Management
    createTenant: async (req: Request, res: Response) => {
      try {
        const { name, planId } = req.body;
        
        if (!name || !planId) {
          return errorResponse(res, 400, 'Name and planId are required');
        }
        
        const tenant = await tenantService.createTenant(db, { name, planId });
        res.status(201).json(tenant);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    listTenants: async (req: Request, res: Response) => {
      try {
        const tenants = await tenantService.listTenants(db);
        res.json(tenants);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    getTenant: async (req: Request, res: Response) => {
      try {
        const tenant = await tenantService.getTenant(db, req.params.id);
        
        if (!tenant) {
          return errorResponse(res, 404, 'Tenant not found');
        }
        
        res.json(tenant);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    updateTenantStatus: async (req: Request, res: Response) => {
      try {
        const { status } = req.body;
        
        if (!status || !['active', 'suspended', 'cancelled'].includes(status)) {
          return errorResponse(res, 400, 'Valid status is required (active, suspended, cancelled)');
        }
        
        await tenantService.updateTenantStatus(db, req.params.id, status);
        res.json({ status: 'success' });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    deleteTenant: async (req: Request, res: Response) => {
      try {
        await tenantService.deleteTenant(db, req.params.id);
        res.json({ status: 'success' });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    // Plan Management
    createPlan: async (req: Request, res: Response) => {
      try {
        const { name, maxStations, maxPumpsPerStation, maxNozzlesPerPump, priceMonthly, features } = req.body;
        
        if (!name) {
          return errorResponse(res, 400, 'Plan name is required');
        }
        
        const plan = await planService.createPlan(db, {
          name,
          maxStations,
          maxPumpsPerStation,
          maxNozzlesPerPump,
          priceMonthly,
          features
        });
        
        res.status(201).json(plan);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    listPlans: async (req: Request, res: Response) => {
      try {
        const plans = await planService.listPlans(db);
        res.json(plans);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    getPlan: async (req: Request, res: Response) => {
      try {
        const plan = await planService.getPlan(db, req.params.id);
        
        if (!plan) {
          return errorResponse(res, 404, 'Plan not found');
        }
        
        res.json(plan);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    updatePlan: async (req: Request, res: Response) => {
      try {
        const { name, maxStations, maxPumpsPerStation, maxNozzlesPerPump, priceMonthly, features } = req.body;
        
        const plan = await planService.updatePlan(db, req.params.id, {
          name,
          maxStations,
          maxPumpsPerStation,
          maxNozzlesPerPump,
          priceMonthly,
          features
        });
        
        res.json(plan);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    deletePlan: async (req: Request, res: Response) => {
      try {
        await planService.deletePlan(db, req.params.id);
        res.json({ status: 'success' });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    // Admin User Management
    createAdminUser: async (req: Request, res: Response) => {
      try {
        const { email, password, role } = req.body;
        
        if (!email) {
          return errorResponse(res, 400, 'Email is required');
        }
        
        const adminUser = await adminService.createAdminUser(db, { email, password, role });
        res.status(201).json(adminUser);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    listAdminUsers: async (req: Request, res: Response) => {
      try {
        const adminUsers = await adminService.listAdminUsers(db);
        res.json(adminUsers);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    getAdminUser: async (req: Request, res: Response) => {
      try {
        const adminUser = await adminService.getAdminUser(db, req.params.id);
        
        if (!adminUser) {
          return errorResponse(res, 404, 'Admin user not found');
        }
        
        res.json(adminUser);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    updateAdminUser: async (req: Request, res: Response) => {
      try {
        const { email, role } = req.body;
        
        const adminUser = await adminService.updateAdminUser(db, req.params.id, { email, role });
        res.json(adminUser);
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    deleteAdminUser: async (req: Request, res: Response) => {
      try {
        await adminService.deleteAdminUser(db, req.params.id);
        res.json({ status: 'success' });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    resetAdminPassword: async (req: Request, res: Response) => {
      try {
        const { password } = req.body;
        
        if (!password) {
          return errorResponse(res, 400, 'Password is required');
        }
        
        await adminService.resetAdminPassword(db, req.params.id, password);
        res.json({ status: 'success' });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    },
    
    // Dashboard Analytics
    getDashboardMetrics: async (req: Request, res: Response) => {
      try {
        // Get tenant count
        const tenantResult = await db.query('SELECT COUNT(*) FROM public.tenants');
        const tenantCount = parseInt(tenantResult.rows[0].count);
        
        // Get active tenant count
        const activeTenantResult = await db.query("SELECT COUNT(*) FROM public.tenants WHERE status = 'active'");
        const activeTenantCount = parseInt(activeTenantResult.rows[0].count);
        
        // Get plan count
        const planResult = await db.query('SELECT COUNT(*) FROM public.plans');
        const planCount = parseInt(planResult.rows[0].count);
        
        // Get admin user count
        const adminResult = await db.query('SELECT COUNT(*) FROM public.admin_users');
        const adminCount = parseInt(adminResult.rows[0].count);
        
        res.json({
          tenantCount,
          activeTenantCount,
          planCount,
          adminCount
        });
      } catch (err: any) {
        return errorResponse(res, 500, err.message);
      }
    }
  };
}