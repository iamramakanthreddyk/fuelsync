/**
 * @file onboarding.controller.ts
 * @description Controller for onboarding and user guidance features
 */

// Types handled by TypeScript compilation
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { successResponse } from '../utils/successResponse';
import { errorResponse } from '../utils/errorResponse';

export function createOnboardingController(db: Pool) {
  return {
    /**
     * Get onboarding status for current tenant (uses existing setup-status logic)
     */
    getStatus: async (req: Request, res: Response) => {
      try {
        if (!req.user?.tenantId) {
          return errorResponse(res, 401, 'Unauthorized');
        }
        const { tenantId } = req.user;

        // Use existing setup status service
        const { getSetupStatus } = await import('../services/setupStatus.service');
        const setupStatus = await getSetupStatus(db, tenantId);

        // Calculate completion percentage
        const steps = [setupStatus.hasStation, setupStatus.hasPump, setupStatus.hasNozzle, setupStatus.hasFuelPrice];
        const completedSteps = steps.filter(Boolean).length;
        const completionPercentage = Math.round((completedSteps / steps.length) * 100);

        // Determine next step
        let nextStep = 'Setup complete!';
        let nextStepRoute = '/dashboard';

        if (!setupStatus.hasStation) {
          nextStep = 'Create your first station';
          nextStepRoute = '/dashboard/stations/new';
        } else if (!setupStatus.hasPump) {
          nextStep = 'Add fuel pumps to your station';
          nextStepRoute = '/dashboard/pumps/new';
        } else if (!setupStatus.hasNozzle) {
          nextStep = 'Configure nozzles for your pumps';
          nextStepRoute = '/dashboard/nozzles/new';
        } else if (!setupStatus.hasFuelPrice) {
          nextStep = 'Set fuel prices';
          nextStepRoute = '/dashboard/fuel-prices';
        }

        return successResponse(res, {
          ...setupStatus,
          completionPercentage,
          nextStep,
          nextStepRoute
        });
      } catch (error: any) {
        console.error('Error getting onboarding status:', error);
        return errorResponse(res, 500, 'Failed to get onboarding status');
      }
    },

    /**
     * Get daily reminders for current tenant
     */
    getReminders: async (req: Request, res: Response) => {
      try {
        if (!req.user?.tenantId) {
          return errorResponse(res, 401, 'Unauthorized - Missing tenant context');
        }
        const { tenantId } = req.user;
        const today = new Date().toISOString().split('T')[0];
        const reminders = [];

        // Check if readings need to be entered today
        const todayReadingCheck = await db.query(
          'SELECT COUNT(*) as count FROM public.nozzle_readings WHERE tenant_id = $1 AND DATE(recorded_at) = $2',
          [tenantId, today]
        );

        if (parseInt(todayReadingCheck.rows[0].count) === 0) {
          // Check if they have nozzles to read
          const nozzleCount = await db.query(
            'SELECT COUNT(*) as count FROM public.nozzles WHERE tenant_id = $1',
            [tenantId]
          );

          if (parseInt(nozzleCount.rows[0].count) > 0) {
            reminders.push({
              id: 'daily-reading',
              type: 'reading_entry',
              title: 'Enter Today\'s Readings',
              message: 'Don\'t forget to record today\'s nozzle readings to track your sales accurately.',
              priority: 'high',
              dueDate: today,
              completed: false,
              route: '/dashboard/readings/new'
            });
          }
        }

        // Check for reconciliation reminders
        const lastReconciliation = await db.query(
          'SELECT MAX(DATE(created_at)) as last_date FROM public.day_reconciliations WHERE tenant_id = $1',
          [tenantId]
        );

        const lastReconciliationDate = lastReconciliation.rows[0]?.last_date;
        const daysSinceReconciliation = lastReconciliationDate 
          ? Math.floor((new Date().getTime() - new Date(lastReconciliationDate).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceReconciliation > 7) {
          reminders.push({
            id: 'weekly-reconciliation',
            type: 'reconciliation',
            title: 'Weekly Reconciliation Due',
            message: 'It\'s been over a week since your last reconciliation. Review your cash and sales data.',
            priority: daysSinceReconciliation > 14 ? 'urgent' : 'medium',
            dueDate: today,
            completed: false,
            route: '/dashboard/reconciliation'
          });
        }

        // Check for low fuel inventory
        const lowInventoryCheck = await db.query(`
          SELECT fi.fuel_type, fi.current_stock
          FROM public.fuel_inventory fi
          WHERE fi.tenant_id = $1 AND fi.current_stock < fi.minimum_level
        `, [tenantId]);

        if (lowInventoryCheck.rows.length > 0) {
          reminders.push({
            id: 'low-inventory',
            type: 'fuel_delivery',
            title: 'Low Fuel Inventory Alert',
            message: `${lowInventoryCheck.rows.length} fuel type(s) are running low. Consider ordering more fuel.`,
            priority: 'medium',
            dueDate: today,
            completed: false,
            route: '/dashboard/inventory'
          });
        }

        return successResponse(res, reminders);
      } catch (error: any) {
        console.error('Error getting reminders:', error);
        return errorResponse(res, 500, 'Failed to get reminders');
      }
    },

    /**
     * Mark a reminder as completed
     */
    completeReminder: async (req: Request, res: Response) => {
      try {
        const { reminderId } = req.params;
        if (!req.user?.tenantId) {
          return errorResponse(res, 401, 'Unauthorized');
        }
        const { tenantId } = req.user;

        // For now, we'll just track this in memory or logs
        // In a real implementation, you might want to store this in the database
        console.log(`Reminder ${reminderId} completed for tenant ${tenantId}`);

        return successResponse(res, { message: 'Reminder completed' });
      } catch (error: any) {
        console.error('Error completing reminder:', error);
        return errorResponse(res, 500, 'Failed to complete reminder');
      }
    },

    /**
     * Get setup guide steps
     */
    getSetupGuide: async (req: Request, res: Response) => {
      try {
        if (!req.user?.tenantId) {
          return errorResponse(res, 401, 'Unauthorized');
        }
        const { tenantId } = req.user;

        // Check completion status for each step
        const [stationCheck, pumpCheck, nozzleCheck, fuelPriceCheck] = await Promise.all([
          db.query('SELECT COUNT(*) as count FROM public.stations WHERE tenant_id = $1', [tenantId]),
          db.query('SELECT COUNT(*) as count FROM public.pumps WHERE tenant_id = $1', [tenantId]),
          db.query('SELECT COUNT(*) as count FROM public.nozzles WHERE tenant_id = $1', [tenantId]),
          db.query('SELECT COUNT(*) as count FROM public.fuel_prices WHERE tenant_id = $1', [tenantId])
        ]);

        const hasStation = parseInt(stationCheck.rows[0].count) > 0;
        const hasPump = parseInt(pumpCheck.rows[0].count) > 0;
        const hasNozzle = parseInt(nozzleCheck.rows[0].count) > 0;
        const hasFuelPrice = parseInt(fuelPriceCheck.rows[0].count) > 0;

        const setupSteps = [
          {
            step: 1,
            title: 'Create Your First Station',
            description: 'Set up your fuel station with basic information like name and address.',
            route: '/dashboard/stations/new',
            completed: hasStation,
            required: true,
            estimatedTime: '2 minutes'
          },
          {
            step: 2,
            title: 'Add Fuel Pumps',
            description: 'Configure the fuel pumps at your station.',
            route: '/dashboard/pumps/new',
            completed: hasPump,
            required: true,
            estimatedTime: '3 minutes',
            prerequisites: hasStation ? [] : ['station']
          },
          {
            step: 3,
            title: 'Setup Nozzles',
            description: 'Configure nozzles for different fuel types on your pumps.',
            route: '/dashboard/nozzles/new',
            completed: hasNozzle,
            required: true,
            estimatedTime: '5 minutes',
            prerequisites: hasPump ? [] : ['pump']
          },
          {
            step: 4,
            title: 'Set Fuel Prices',
            description: 'Configure pricing for different fuel types.',
            route: '/dashboard/fuel-prices',
            completed: hasFuelPrice,
            required: true,
            estimatedTime: '2 minutes',
            prerequisites: hasNozzle ? [] : ['nozzle']
          },
          {
            step: 5,
            title: 'Record First Reading',
            description: 'Enter your first nozzle reading to start tracking sales.',
            route: '/dashboard/readings/new',
            completed: false, // This is optional
            required: false,
            estimatedTime: '1 minute',
            prerequisites: hasFuelPrice ? [] : ['fuel-price']
          }
        ];

        return successResponse(res, setupSteps);
      } catch (error: any) {
        console.error('Error getting setup guide:', error);
        return errorResponse(res, 500, 'Failed to get setup guide');
      }
    },

    /**
     * Skip onboarding
     */
    skipOnboarding: async (req: Request, res: Response) => {
      try {
        if (!req.user?.tenantId) {
          return errorResponse(res, 401, 'Unauthorized');
        }
        const { tenantId } = req.user;

        // Mark onboarding as skipped in database (you might want to add this field)
        // For now, just log it
        console.log(`Onboarding skipped for tenant ${tenantId}`);

        return successResponse(res, { message: 'Onboarding skipped' });
      } catch (error: any) {
        console.error('Error skipping onboarding:', error);
        return errorResponse(res, 500, 'Failed to skip onboarding');
      }
    },

    /**
     * Track user interaction
     */
    trackInteraction: async (req: Request, res: Response) => {
      try {
        const { action, context, timestamp } = req.body;
        if (!req.user?.tenantId || !req.user?.id) {
          return errorResponse(res, 401, 'Unauthorized');
        }
        const { tenantId, id: userId } = req.user;

        // Log interaction for analytics
        console.log('User interaction tracked:', {
          tenantId,
          userId,
          action,
          context,
          timestamp
        });

        // In a real implementation, you might want to store this in an analytics database
        return successResponse(res, { message: 'Interaction tracked' });
      } catch (error: any) {
        console.error('Error tracking interaction:', error);
        return errorResponse(res, 500, 'Failed to track interaction');
      }
    }
  };
}
