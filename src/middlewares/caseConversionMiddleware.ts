/**
 * @file middlewares/caseConversionMiddleware.ts
 * @description Middleware to automatically convert API responses to camelCase
 */

import { Request, Response, NextFunction } from 'express';
import { convertKeysToCamelCase, convertKeysToSnakeCase, validateApiResponse } from '../utils/caseConverter';

/**
 * Middleware to convert request body from camelCase to snake_case for database operations
 */
export function convertRequestToSnakeCase() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      req.body = convertKeysToSnakeCase(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      // Convert query parameters but preserve original for backward compatibility
      const convertedQuery = convertKeysToSnakeCase(req.query);
      req.query = { ...req.query, ...convertedQuery };
    }
    
    next();
  };
}

/**
 * Middleware to convert response data from snake_case to camelCase
 */
export function convertResponseToCamelCase() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      // Convert the response data to camelCase
      const convertedData = convertKeysToCamelCase(data);
      
      // Validate response in development
      if (process.env.NODE_ENV === 'development') {
        if (!validateApiResponse(convertedData)) {
          console.warn(`⚠️  [CASE-CONVERSION] Inconsistent response at ${req.originalUrl}`);
        }
      }
      
      return originalJson.call(this, convertedData);
    };
    
    next();
  };
}

/**
 * Combined middleware for full case conversion
 */
export function caseConversionMiddleware() {
  return [
    convertRequestToSnakeCase(),
    convertResponseToCamelCase()
  ];
}

/**
 * Middleware specifically for database query results
 */
export function dbResultConversionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;
    
    // Override json method
    res.json = function(data: any) {
      let convertedData = data;
      
      // Handle different response formats
      if (data && typeof data === 'object') {
        if (data.success !== undefined && data.data !== undefined) {
          // Standard API response format
          convertedData = {
            ...data,
            data: convertKeysToCamelCase(data.data)
          };
        } else if (data.rows) {
          // Direct database result format
          convertedData = {
            ...data,
            rows: data.rows.map((row: any) => convertKeysToCamelCase(row))
          };
        } else {
          // Direct data format
          convertedData = convertKeysToCamelCase(data);
        }
      }
      
      return originalJson.call(this, convertedData);
    };
    
    // Override send method for non-JSON responses
    res.send = function(data: any) {
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          const converted = convertKeysToCamelCase(parsed);
          return originalSend.call(this, JSON.stringify(converted));
        } catch (e) {
          // Not JSON, send as-is
          return originalSend.call(this, data);
        }
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * Middleware to log case conversion statistics
 */
export function caseConversionStatsMiddleware() {
  const stats = {
    totalRequests: 0,
    conversionsApplied: 0,
    inconsistentResponses: 0
  };
  
  return (req: Request, res: Response, next: NextFunction) => {
    stats.totalRequests++;
    
    const originalJson = res.json;
    
    res.json = function(data: any) {
      const hasSnakeCase = JSON.stringify(data).includes('_');
      
      if (hasSnakeCase) {
        stats.conversionsApplied++;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 [CASE-CONVERSION] Applied conversion at ${req.originalUrl}`);
        }
      }
      
      const convertedData = convertKeysToCamelCase(data);
      
      if (!validateApiResponse(convertedData)) {
        stats.inconsistentResponses++;
      }
      
      // Log stats every 100 requests in development
      if (process.env.NODE_ENV === 'development' && stats.totalRequests % 100 === 0) {
        console.log('📊 [CASE-CONVERSION-STATS]', {
          totalRequests: stats.totalRequests,
          conversionsApplied: stats.conversionsApplied,
          inconsistentResponses: stats.inconsistentResponses,
          conversionRate: `${((stats.conversionsApplied / stats.totalRequests) * 100).toFixed(1)}%`
        });
      }
      
      return originalJson.call(this, convertedData);
    };
    
    next();
  };
}

/**
 * Express error handler that ensures error responses are also camelCase
 */
export function caseConversionErrorHandler() {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    // Convert error details to camelCase
    const errorResponse = {
      success: false,
      message: err.message || 'Internal Server Error',
      error: convertKeysToCamelCase(err.details || {}),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };
    
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json(errorResponse);
  };
}

/**
 * Utility to manually convert a service response
 */
export function convertServiceResponse<T>(data: any): T {
  return convertKeysToCamelCase<T>(data);
}

/**
 * Decorator for service methods to automatically convert results
 */
export function autoConvertResult(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = async function(...args: any[]) {
    const result = await method.apply(this, args);
    return convertKeysToCamelCase(result);
  };
  
  return descriptor;
}
