/**
 * @file onboarding.routes.ts
 * @description Routes for onboarding and user guidance features
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { createOnboardingController } from '../controllers/onboarding.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

export function createOnboardingRoutes(db: Pool): Router {
  const router = Router();
  const onboardingController = createOnboardingController(db);

  // Apply authentication to all routes
  router.use(authenticateJWT);

  /**
   * @route GET /api/onboarding/status
   * @description Get onboarding status for current tenant
   * @access Private (Owner, Manager, Attendant)
   */
  router.get('/status', onboardingController.getStatus);

  /**
   * @route GET /api/onboarding/reminders
   * @description Get daily reminders for current tenant
   * @access Private (Owner, Manager, Attendant)
   */
  router.get('/reminders', onboardingController.getReminders);

  /**
   * @route POST /api/onboarding/reminders/:reminderId/complete
   * @description Mark a reminder as completed
   * @access Private (Owner, Manager, Attendant)
   */
  router.post('/reminders/:reminderId/complete', onboardingController.completeReminder);

  /**
   * @route GET /api/onboarding/setup-guide
   * @description Get setup guide steps with completion status
   * @access Private (Owner, Manager, Attendant)
   */
  router.get('/setup-guide', onboardingController.getSetupGuide);

  /**
   * @route POST /api/onboarding/setup-guide/:step/complete
   * @description Mark a setup step as completed (optional endpoint)
   * @access Private (Owner, Manager, Attendant)
   */
  router.post('/setup-guide/:step/complete', (req, res) => {
    // This could be implemented if you want to track step completion
    res.json({ message: 'Step completion tracked' });
  });

  /**
   * @route POST /api/onboarding/skip
   * @description Skip the onboarding process
   * @access Private (Owner, Manager)
   */
  router.post('/skip', onboardingController.skipOnboarding);

  /**
   * @route POST /api/onboarding/reset
   * @description Reset onboarding status (for re-doing setup)
   * @access Private (Owner, Manager)
   */
  router.post('/reset', (req, res) => {
    // This could be implemented if you want to allow resetting onboarding
    res.json({ message: 'Onboarding reset' });
  });

  /**
   * @route GET /api/onboarding/preferences
   * @description Get notification preferences
   * @access Private (Owner, Manager, Attendant)
   */
  router.get('/preferences', (req, res) => {
    // Return default preferences for now
    res.json({
      dailyReminders: true,
      setupGuidance: true,
      readingAlerts: true,
      reconciliationReminders: true
    });
  });

  /**
   * @route PUT /api/onboarding/preferences
   * @description Update notification preferences
   * @access Private (Owner, Manager, Attendant)
   */
  router.put('/preferences', (req, res) => {
    // This could be implemented to store user preferences
    res.json({ message: 'Preferences updated' });
  });

  /**
   * @route GET /api/onboarding/help
   * @description Get contextual help for current route
   * @access Private (Owner, Manager, Attendant)
   */
  router.get('/help', (req, res) => {
    const { route } = req.query;
    
    // Return contextual help based on route
    const helpContent = getContextualHelp(route as string);
    res.json(helpContent);
  });

  /**
   * @route POST /api/onboarding/track
   * @description Track user interaction for analytics
   * @access Private (Owner, Manager, Attendant)
   */
  router.post('/track', onboardingController.trackInteraction);

  return router;
}

/**
 * Get contextual help content based on route
 */
function getContextualHelp(route: string) {
  const helpMap: Record<string, any> = {
    '/dashboard/stations': {
      title: 'Managing Stations',
      content: 'Stations represent your physical fuel station locations. Each station can have multiple pumps.',
      tips: [
        'Start by creating your first station with basic information',
        'You can add multiple stations if you have multiple locations',
        'Station status affects all pumps and nozzles within it'
      ],
      relatedLinks: [
        { title: 'Add New Station', route: '/dashboard/stations/new' },
        { title: 'View Pumps', route: '/dashboard/pumps' }
      ]
    },
    '/dashboard/pumps': {
      title: 'Managing Pumps',
      content: 'Pumps are the fuel dispensing units at your stations. Each pump can have multiple nozzles.',
      tips: [
        'Pumps must be assigned to a station',
        'Each pump should have a unique identifier or serial number',
        'Pump status affects all nozzles connected to it'
      ],
      relatedLinks: [
        { title: 'Add New Pump', route: '/dashboard/pumps/new' },
        { title: 'View Nozzles', route: '/dashboard/nozzles' }
      ]
    },
    '/dashboard/nozzles': {
      title: 'Managing Nozzles',
      content: 'Nozzles dispense specific fuel types. Each nozzle tracks readings and sales.',
      tips: [
        'Each nozzle must be assigned to a pump',
        'Nozzle numbers should be unique within each pump',
        'Different nozzles can dispense different fuel types'
      ],
      relatedLinks: [
        { title: 'Add New Nozzle', route: '/dashboard/nozzles/new' },
        { title: 'Set Fuel Prices', route: '/dashboard/fuel-prices' }
      ]
    },
    '/dashboard/readings': {
      title: 'Recording Readings',
      content: 'Regular readings track fuel dispensed and calculate sales automatically.',
      tips: [
        'Record readings at least once daily for accurate tracking',
        'Always enter the current meter reading, not the difference',
        'Readings should always increase from the previous reading'
      ],
      relatedLinks: [
        { title: 'New Reading', route: '/dashboard/readings/new' },
        { title: 'View Sales', route: '/dashboard/sales' }
      ]
    }
  };

  return helpMap[route] || {
    title: 'Help',
    content: 'Welcome to FuelSync Hub. Use the navigation menu to access different features.',
    tips: [
      'Start with the setup wizard if you\'re new to the system',
      'Check daily reminders for important tasks',
      'Use the dashboard for an overview of your operations'
    ],
    relatedLinks: [
      { title: 'Dashboard', route: '/dashboard' },
      { title: 'Setup Guide', route: '/dashboard/setup' }
    ]
  };
}
