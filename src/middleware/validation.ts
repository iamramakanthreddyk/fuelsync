/**
 * @file validation.ts
 * @description Enhanced validation middleware with comprehensive error handling
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { errorResponse } from '../utils/errorResponse';

// Common validation schemas
export const commonSchemas = {
  id: z.string().uuid('Invalid ID format'),
  tenantId: z.string().uuid('Invalid tenant ID format'),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  datetime: z.string().datetime('Invalid datetime format'),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().min(0, 'Must be non-negative'),
  fuelType: z.enum(['Petrol', 'Diesel', 'CNG', 'LPG']),
  userRole: z.enum(['owner', 'manager', 'attendant', 'superadmin']),
  status: z.enum(['active', 'inactive', 'maintenance'])
};

// Reading validation schemas
export const readingSchemas = {
  create: z.object({
    nozzleId: commonSchemas.id,
    reading: commonSchemas.positiveNumber,
    notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
    recordedAt: commonSchemas.datetime.optional()
  }),
  
  update: z.object({
    reading: commonSchemas.positiveNumber.optional(),
    notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional()
  }),

  query: z.object({
    stationId: commonSchemas.id.optional(),
    nozzleId: commonSchemas.id.optional(),
    dateFrom: commonSchemas.date.optional(),
    dateTo: commonSchemas.date.optional(),
    limit: z.coerce.number().min(1).max(1000).default(50),
    offset: z.coerce.number().min(0).default(0)
  })
};

// Station validation schemas
export const stationSchemas = {
  create: z.object({
    name: z.string().min(1, 'Station name is required').max(100, 'Name too long'),
    address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
    phone: commonSchemas.phone.optional(),
    email: commonSchemas.email.optional(),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }).optional()
  }),

  update: z.object({
    name: z.string().min(1).max(100).optional(),
    address: z.string().min(1).max(500).optional(),
    phone: commonSchemas.phone.optional(),
    email: commonSchemas.email.optional(),
    status: commonSchemas.status.optional(),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }).optional()
  })
};

// User validation schemas
export const userSchemas = {
  create: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    email: commonSchemas.email,
    password: z.string().min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
    role: commonSchemas.userRole,
    phone: commonSchemas.phone.optional()
  }),

  update: z.object({
    name: z.string().min(1).max(100).optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone.optional(),
    role: commonSchemas.userRole.optional(),
    status: commonSchemas.status.optional()
  }),

  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required')
  })
};

// Inventory validation schemas
export const inventorySchemas = {
  update: z.object({
    currentStock: commonSchemas.nonNegativeNumber,
    minimumLevel: commonSchemas.nonNegativeNumber,
    maximumCapacity: commonSchemas.positiveNumber,
    notes: z.string().max(500).optional()
  }),

  query: z.object({
    stationId: commonSchemas.id.optional(),
    fuelType: commonSchemas.fuelType.optional(),
    lowStock: z.coerce.boolean().optional()
  })
};

// Generic validation middleware factory
export function validateSchema(schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return errorResponse(res, 400, 'Validation failed', errors);
      }

      // Replace the original data with validated and transformed data
      req[source] = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return errorResponse(res, 500, 'Internal validation error');
    }
  };
}

// Specific validation middlewares
export const validateReadingCreate = validateSchema(readingSchemas.create, 'body');
export const validateReadingUpdate = validateSchema(readingSchemas.update, 'body');
export const validateReadingQuery = validateSchema(readingSchemas.query, 'query');

export const validateStationCreate = validateSchema(stationSchemas.create, 'body');
export const validateStationUpdate = validateSchema(stationSchemas.update, 'body');

export const validateUserCreate = validateSchema(userSchemas.create, 'body');
export const validateUserUpdate = validateSchema(userSchemas.update, 'body');
export const validateUserLogin = validateSchema(userSchemas.login, 'body');

export const validateInventoryUpdate = validateSchema(inventorySchemas.update, 'body');
export const validateInventoryQuery = validateSchema(inventorySchemas.query, 'query');

// ID parameter validation
export const validateIdParam = validateSchema(
  z.object({ id: commonSchemas.id }), 
  'params'
);

// Pagination validation
export const validatePagination = validateSchema(
  z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(1000).default(50),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),
  'query'
);

// Date range validation
export const validateDateRange = validateSchema(
  z.object({
    dateFrom: commonSchemas.date.optional(),
    dateTo: commonSchemas.date.optional()
  }).refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    {
      message: 'dateFrom must be before or equal to dateTo',
      path: ['dateRange']
    }
  ),
  'query'
);

// Tenant isolation validation
export const validateTenantAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  if (!user || !user.tenantId) {
    return errorResponse(res, 403, 'Unauthorized: No tenant access');
  }

  // Add tenant filter to query parameters
  req.query.tenantId = user.tenantId;
  next();
};

// Rate limiting validation
export const validateRateLimit = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < windowStart) {
        requests.delete(key);
      }
    }

    const clientData = requests.get(clientId) || { count: 0, resetTime: now + windowMs };

    if (clientData.count >= maxRequests && clientData.resetTime > now) {
      return errorResponse(res, 429, 'Rate limit exceeded');
    }

    clientData.count++;
    requests.set(clientId, clientData);
    next();
  };
};

// File upload validation
export const validateFileUpload = (
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp'],
  maxSize: number = 5 * 1024 * 1024 // 5MB
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const file = (req as any).file;

    if (!file) {
      return next(); // File is optional
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return errorResponse(res, 400, `Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      return errorResponse(res, 400, `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
    }

    next();
  };
};
