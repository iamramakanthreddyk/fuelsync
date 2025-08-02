/**
 * @file middlewares/activityLogger.ts
 * @description Middleware to automatically log user activities
 */
// Types handled by TypeScript compilation
import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { logActivity } from '../services/activityTracking.service';

// Activity mapping for different routes
const ACTIVITY_MAPPING: Record<string, { action: string; resource: string }> = {
  // Authentication
  'POST /api/auth/login': { action: 'LOGIN', resource: 'auth' },
  'POST /api/auth/logout': { action: 'LOGOUT', resource: 'auth' },
  'POST /api/auth/refresh': { action: 'TOKEN_REFRESH', resource: 'auth' },
  
  // Stations
  'GET /api/stations': { action: 'VIEW_STATIONS', resource: 'stations' },
  'POST /api/stations': { action: 'CREATE_STATION', resource: 'stations' },
  'PUT /api/stations/:id': { action: 'UPDATE_STATION', resource: 'stations' },
  'DELETE /api/stations/:id': { action: 'DELETE_STATION', resource: 'stations' },
  
  // Pumps
  'GET /api/pumps': { action: 'VIEW_PUMPS', resource: 'pumps' },
  'POST /api/pumps': { action: 'CREATE_PUMP', resource: 'pumps' },
  'PUT /api/pumps/:id': { action: 'UPDATE_PUMP', resource: 'pumps' },
  'DELETE /api/pumps/:id': { action: 'DELETE_PUMP', resource: 'pumps' },
  
  // Nozzles
  'GET /api/nozzles': { action: 'VIEW_NOZZLES', resource: 'nozzles' },
  'POST /api/nozzles': { action: 'CREATE_NOZZLE', resource: 'nozzles' },
  'PUT /api/nozzles/:id': { action: 'UPDATE_NOZZLE', resource: 'nozzles' },
  'DELETE /api/nozzles/:id': { action: 'DELETE_NOZZLE', resource: 'nozzles' },
  
  // Readings
  'GET /api/readings': { action: 'VIEW_READINGS', resource: 'readings' },
  'POST /api/readings': { action: 'CREATE_READING', resource: 'readings' },
  'PUT /api/readings/:id': { action: 'UPDATE_READING', resource: 'readings' },
  'DELETE /api/readings/:id': { action: 'DELETE_READING', resource: 'readings' },
  
  // Sales
  'GET /api/sales': { action: 'VIEW_SALES', resource: 'sales' },
  'POST /api/sales': { action: 'CREATE_SALE', resource: 'sales' },
  'PUT /api/sales/:id': { action: 'UPDATE_SALE', resource: 'sales' },
  'DELETE /api/sales/:id': { action: 'DELETE_SALE', resource: 'sales' },
  
  // Reports
  'GET /api/reports/sales': { action: 'GENERATE_SALES_REPORT', resource: 'reports' },
  'GET /api/reports/financial': { action: 'GENERATE_FINANCIAL_REPORT', resource: 'reports' },
  'POST /api/reports/export': { action: 'EXPORT_REPORT', resource: 'reports' },
  'POST /api/reports/schedule': { action: 'SCHEDULE_REPORT', resource: 'reports' },
  
  // Users
  'GET /api/users': { action: 'VIEW_USERS', resource: 'users' },
  'POST /api/users': { action: 'CREATE_USER', resource: 'users' },
  'PUT /api/users/:id': { action: 'UPDATE_USER', resource: 'users' },
  'DELETE /api/users/:id': { action: 'DELETE_USER', resource: 'users' },
  'POST /api/users/reset-password': { action: 'RESET_PASSWORD', resource: 'users' },
  
  // Cash Reports
  'GET /api/cash-reports': { action: 'VIEW_CASH_REPORTS', resource: 'cash-reports' },
  'POST /api/cash-reports': { action: 'SUBMIT_CASH_REPORT', resource: 'cash-reports' },
  
  // Reconciliation
  'GET /api/reconciliation': { action: 'VIEW_RECONCILIATION', resource: 'reconciliation' },
  'POST /api/reconciliation/close-day': { action: 'CLOSE_DAY', resource: 'reconciliation' },
  
  // Fuel Prices
  'GET /api/fuel-prices': { action: 'VIEW_FUEL_PRICES', resource: 'fuel-prices' },
  'POST /api/fuel-prices': { action: 'UPDATE_FUEL_PRICES', resource: 'fuel-prices' },
  
  // Inventory
  'GET /api/inventory': { action: 'VIEW_INVENTORY', resource: 'inventory' },
  'POST /api/inventory': { action: 'UPDATE_INVENTORY', resource: 'inventory' },
  
  // Creditors
  'GET /api/creditors': { action: 'VIEW_CREDITORS', resource: 'creditors' },
  'POST /api/creditors': { action: 'CREATE_CREDITOR', resource: 'creditors' },
  'PUT /api/creditors/:id': { action: 'UPDATE_CREDITOR', resource: 'creditors' },
  'DELETE /api/creditors/:id': { action: 'DELETE_CREDITOR', resource: 'creditors' },
  
  // SuperAdmin
  'GET /api/superadmin/tenants': { action: 'VIEW_ALL_TENANTS', resource: 'superadmin' },
  'POST /api/superadmin/tenants/:id/assign-plan': { action: 'ASSIGN_PLAN', resource: 'superadmin' },
  'PATCH /api/superadmin/tenants/:id/status': { action: 'CHANGE_TENANT_STATUS', resource: 'superadmin' },
  'POST /api/superadmin/users/reset-password': { action: 'ADMIN_RESET_PASSWORD', resource: 'superadmin' },
};

// Routes to skip logging (to avoid noise)
const SKIP_LOGGING = [
  'GET /api/health',
  'GET /api/dashboard/stats',
  'GET /api/auth/me',
  'OPTIONS',
];

/**
 * Create activity logging middleware
 */
export function createActivityLogger(db: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if not authenticated or no user context
    if (!(req as any).user?.userId || !(req as any).user?.tenantId) {
      return next();
    }
    
    const routeKey = `${req.method} ${req.route?.path || req.path}`;
    const normalizedRoute = normalizeRoute(routeKey);
    
    // Skip logging for certain routes
    if (SKIP_LOGGING.some(skip => normalizedRoute.includes(skip))) {
      return next();
    }
    
    // Get activity mapping
    const activityInfo = ACTIVITY_MAPPING[normalizedRoute] || {
      action: `${req.method}_REQUEST`,
      resource: extractResourceFromPath(req.path)
    };
    
    // Capture request details
    const details: any = {
      method: req.method,
      path: req.path,
      query: req.query,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    // Add body for POST/PUT requests (excluding sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      details.body = sanitizeRequestBody(req.body);
    }
    
    // Add route parameters
    if (req.params && Object.keys(req.params).length > 0) {
      details.params = req.params;
    }
    
    // Log the activity (async, don't wait)
    logActivity(
      db,
      (req as any).user.tenantId,
      (req as any).user.userId,
      activityInfo.action,
      activityInfo.resource,
      details,
      req.ip,
      req.get('User-Agent')
    ).catch(error => {
      console.error('[ACTIVITY-LOGGER] Failed to log activity:', error);
    });
    
    next();
  };
}

/**
 * Normalize route path for mapping
 */
function normalizeRoute(route: string): string {
  return route
    .replace(/\/api\/v\d+/, '/api') // Remove version
    .replace(/\/[a-f0-9-]{36}/g, '/:id') // Replace UUIDs with :id
    .replace(/\/\d+/g, '/:id') // Replace numeric IDs with :id
    .replace(/\/[^\/]+\/[a-f0-9-]{36}/g, '/:resource/:id'); // Handle nested resources
}

/**
 * Extract resource name from path
 */
function extractResourceFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[0] === 'api') {
    return parts[1]; // Return the resource name after /api/
  }
  return 'unknown';
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password', 'password_hash', 'token', 'secret', 'key',
    'authorization', 'auth', 'credential', 'private'
  ];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  db: Pool,
  tenantId: string | null,
  userId: string | null,
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'TOKEN_REFRESH',
  details: any = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await logActivity(
      db,
      tenantId || 'system',
      userId || 'anonymous',
      action,
      'auth',
      details,
      ipAddress,
      userAgent
    );
  } catch (error) {
    console.error('[ACTIVITY-LOGGER] Failed to log auth event:', error);
  }
}

/**
 * Log plan limit violations
 */
export async function logPlanViolation(
  db: Pool,
  tenantId: string,
  userId: string,
  violationType: string,
  details: any = {}
): Promise<void> {
  try {
    await logActivity(
      db,
      tenantId,
      userId,
      'PLAN_LIMIT_EXCEEDED',
      'plan-enforcement',
      {
        violationType,
        ...details,
        timestamp: new Date().toISOString()
      }
    );
  } catch (error) {
    console.error('[ACTIVITY-LOGGER] Failed to log plan violation:', error);
  }
}
