/**
 * @file utils/caseConverter.ts
 * @description Utility functions for converting between snake_case and camelCase
 * This ensures consistent API responses across the entire backend
 */

/**
 * Convert a snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert a camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, (_, letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert an object with snake_case keys to camelCase keys recursively
 */
export function convertKeysToCamelCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item)) as unknown as T;
  }

  const camelCaseObj: any = {};
  
  Object.keys(obj).forEach(key => {
    const camelKey = snakeToCamel(key);
    const value = obj[key];
    
    // Recursively convert nested objects
    if (value !== null && typeof value === 'object') {
      camelCaseObj[camelKey] = convertKeysToCamelCase(value);
    } else {
      camelCaseObj[camelKey] = value;
    }
  });
  
  return camelCaseObj as T;
}

/**
 * Convert an object with camelCase keys to snake_case keys recursively
 */
export function convertKeysToSnakeCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToSnakeCase(item)) as unknown as T;
  }

  const snakeCaseObj: any = {};
  
  Object.keys(obj).forEach(key => {
    const snakeKey = camelToSnake(key);
    const value = obj[key];
    
    // Recursively convert nested objects
    if (value !== null && typeof value === 'object') {
      snakeCaseObj[snakeKey] = convertKeysToSnakeCase(value);
    } else {
      snakeCaseObj[snakeKey] = value;
    }
  });
  
  return snakeCaseObj as T;
}

/**
 * Transform database query results to camelCase
 * This is the main function to use in services and controllers
 */
export function transformDbResult<T = any>(result: any): T {
  if (!result) {
    return result;
  }

  // Handle pg query result format
  if (result.rows) {
    return {
      ...result,
      rows: result.rows.map((row: any) => convertKeysToCamelCase(row))
    } as unknown as T;
  }

  // Handle direct array of rows
  if (Array.isArray(result)) {
    return result.map(row => convertKeysToCamelCase(row)) as unknown as T;
  }

  // Handle single object
  return convertKeysToCamelCase(result);
}

/**
 * Middleware to automatically convert response data to camelCase
 */
export function camelCaseResponseMiddleware() {
  return (req: any, res: any, next: any) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      // Convert the response data to camelCase
      const convertedData = convertKeysToCamelCase(data);
      return originalJson.call(this, convertedData);
    };
    
    next();
  };
}

/**
 * Enhanced success response that automatically converts to camelCase
 */
export function camelCaseSuccessResponse(res: any, data: any, message?: string, statusCode: number = 200) {
  const convertedData = convertKeysToCamelCase(data);
  
  return res.status(statusCode).json({
    success: true,
    message: message || 'Success',
    data: convertedData
  });
}

/**
 * Transform database row to camelCase with type safety
 */
export function transformRow<T>(row: any): T {
  return convertKeysToCamelCase<T>(row);
}

/**
 * Transform array of database rows to camelCase with type safety
 */
export function transformRows<T>(rows: any[]): T[] {
  return rows.map(row => convertKeysToCamelCase<T>(row));
}

/**
 * Special handling for common database patterns
 */
export class DatabaseTransformer {
  /**
   * Transform a typical user query result
   */
  static transformUser(user: any) {
    const transformed = convertKeysToCamelCase(user);
    
    // Handle special cases
    if (transformed.createdAt) {
      transformed.createdAt = new Date(transformed.createdAt).toISOString();
    }
    if (transformed.updatedAt) {
      transformed.updatedAt = new Date(transformed.updatedAt).toISOString();
    }
    
    return transformed;
  }

  /**
   * Transform a typical station query result with nested data
   */
  static transformStation(station: any) {
    const transformed = convertKeysToCamelCase(station);
    
    // Handle nested pumps and nozzles
    if (transformed.pumps) {
      transformed.pumps = transformed.pumps.map((pump: any) => {
        const transformedPump = convertKeysToCamelCase(pump);
        if (transformedPump.nozzles) {
          transformedPump.nozzles = transformedPump.nozzles.map((nozzle: any) => 
            convertKeysToCamelCase(nozzle)
          );
        }
        return transformedPump;
      });
    }
    
    return transformed;
  }

  /**
   * Transform sales data with proper number formatting
   */
  static transformSales(sales: any) {
    const transformed = convertKeysToCamelCase(sales);
    
    // Ensure numeric fields are properly formatted
    if (transformed.volume) {
      transformed.volume = parseFloat(transformed.volume);
    }
    if (transformed.amount) {
      transformed.amount = parseFloat(transformed.amount);
    }
    if (transformed.pricePerLiter) {
      transformed.pricePerLiter = parseFloat(transformed.pricePerLiter);
    }
    
    return transformed;
  }

  /**
   * Transform tenant data with usage statistics
   */
  static transformTenant(tenant: any) {
    const transformed = convertKeysToCamelCase(tenant);
    
    // Convert count fields to numbers
    const countFields = ['userCount', 'stationCount', 'currentStations', 'totalUsers', 'owners', 'managers', 'attendants'];
    countFields.forEach(field => {
      if (transformed[field] !== undefined) {
        transformed[field] = parseInt(transformed[field]) || 0;
      }
    });
    
    // Convert price fields to numbers
    if (transformed.priceMonthly) {
      transformed.priceMonthly = parseFloat(transformed.priceMonthly);
    }
    
    return transformed;
  }
}

/**
 * Validation helper to ensure consistent API responses
 */
export function validateApiResponse(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return true; // Non-objects are fine
  }

  // Check if any keys contain underscores (indicating snake_case)
  const hasSnakeCase = Object.keys(data).some(key => key.includes('_'));
  
  if (hasSnakeCase) {
    console.warn('⚠️  API Response contains snake_case keys:', Object.keys(data).filter(key => key.includes('_')));
    return false;
  }

  // Recursively check nested objects
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!validateApiResponse(item)) {
          return false;
        }
      }
    } else if (value && typeof value === 'object') {
      if (!validateApiResponse(value)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Development helper to log inconsistent responses
 */
export function logCaseInconsistencies(data: any, endpoint: string) {
  if (process.env.NODE_ENV === 'development') {
    if (!validateApiResponse(data)) {
      console.log(`🔍 [CASE-INCONSISTENCY] Endpoint: ${endpoint}`);
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }
}
