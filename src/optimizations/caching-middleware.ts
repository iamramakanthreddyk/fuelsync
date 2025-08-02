/**
 * @file optimizations/caching-middleware.ts
 * @description Advanced caching middleware with Redis and intelligent cache invalidation
 */
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import crypto from 'crypto';

// Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in seconds
  keyPrefix?: string;
  varyBy?: string[]; // Headers or query params to vary cache by
  skipCache?: (req: Request) => boolean;
  generateKey?: (req: Request) => string;
  invalidateOn?: string[]; // Events that should invalidate this cache
}

// Default cache configurations for different endpoints
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  '/api/dashboard/stats': {
    ttl: 300, // 5 minutes
    keyPrefix: 'dashboard_stats',
    varyBy: ['stationId', 'tenantId'],
    skipCache: (req) => req.method !== 'GET',
  },
  '/api/dashboard/sales': {
    ttl: 600, // 10 minutes
    keyPrefix: 'sales_data',
    varyBy: ['stationId', 'tenantId', 'range', 'dateFrom', 'dateTo'],
    skipCache: (req) => req.method !== 'GET',
  },
  '/api/dashboard/payment-breakdown': {
    ttl: 900, // 15 minutes
    keyPrefix: 'payment_breakdown',
    varyBy: ['stationId', 'tenantId', 'dateFrom', 'dateTo'],
    skipCache: (req) => req.method !== 'GET',
  },
  // Report caching configurations
  '/api/reports/sales': {
    ttl: 1800, // 30 minutes for sales reports
    keyPrefix: 'report_sales',
    varyBy: ['tenantId', 'stationId', 'dateFrom', 'dateTo', 'format', 'limit', 'offset'],
    skipCache: (req) => req.method !== 'GET' || req.query.preview === 'true',
  },
  '/api/reports/financial': {
    ttl: 3600, // 1 hour for financial reports
    keyPrefix: 'report_financial',
    varyBy: ['tenantId', 'stationId', 'period'],
    skipCache: (req) => req.method !== 'GET',
  },
  '/api/reports/preview': {
    ttl: 300, // 5 minutes for previews
    keyPrefix: 'report_preview',
    varyBy: ['tenantId', 'type', 'stationId'],
    skipCache: (req) => req.method !== 'GET',
  },
  '/api/dashboard/fuel-breakdown': {
    ttl: 900, // 15 minutes
    keyPrefix: 'fuel_breakdown',
    varyBy: ['stationId', 'tenantId', 'period'],
    skipCache: (req) => req.method !== 'GET',
  },
  '/api/stations': {
    ttl: 1800, // 30 minutes
    keyPrefix: 'stations',
    varyBy: ['tenantId', 'status', 'search', 'page', 'limit'],
    skipCache: (req) => req.method !== 'GET',
    invalidateOn: ['station_created', 'station_updated', 'station_deleted'],
  },
  '/api/pumps': {
    ttl: 1200, // 20 minutes
    keyPrefix: 'pumps',
    varyBy: ['tenantId', 'stationId', 'status', 'search', 'page', 'limit'],
    skipCache: (req) => req.method !== 'GET',
    invalidateOn: ['pump_created', 'pump_updated', 'pump_deleted', 'station_updated'],
  },
};

// Generate cache key based on request
function generateCacheKey(req: Request, config: CacheConfig): string {
  if (config.generateKey) {
    return config.generateKey(req);
  }

  const keyParts: string[] = [config.keyPrefix || 'cache'];
  
  // Add tenant ID for multi-tenancy
  if (req.user?.tenantId) {
    keyParts.push(`tenant:${req.user.tenantId}`);
  }

  // Add vary-by parameters
  if (config.varyBy) {
    config.varyBy.forEach(param => {
      const value = req.query[param] || req.headers[param.toLowerCase()] || req.params[param];
      if (value) {
        keyParts.push(`${param}:${value}`);
      }
    });
  }

  // Add route path
  keyParts.push(`path:${req.route?.path || req.path}`);

  // Create hash for long keys
  const keyString = keyParts.join(':');
  if (keyString.length > 200) {
    return `${config.keyPrefix}:${crypto.createHash('md5').update(keyString).digest('hex')}`;
  }

  return keyString;
}

// Cache middleware factory
export function createCacheMiddleware(configOverride?: Partial<CacheConfig>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get cache configuration for this route
      const routeConfig = CACHE_CONFIGS[req.route?.path || req.path];
      const config = { ...routeConfig, ...configOverride };

      // Skip caching if no config or skip condition is met
      if (!config || (config.skipCache && config.skipCache(req))) {
        return next();
      }

      // Generate cache key
      const cacheKey = generateCacheKey(req, config);

      // Try to get from cache
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${config.ttl}`,
        });

        return res.json(parsed);
      }

      // Store original res.json to intercept response
      const originalJson = res.json.bind(res);
      
      res.json = function(data: any) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setex(cacheKey, config.ttl, JSON.stringify(data)).catch(err => {
            console.error('Cache set error:', err);
          });
        }

        // Add cache headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${config.ttl}`,
        });

        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

// Cache invalidation system
class CacheInvalidator {
  private static instance: CacheInvalidator;
  private invalidationRules: Map<string, string[]> = new Map();

  private constructor() {
    this.setupInvalidationRules();
  }

  static getInstance(): CacheInvalidator {
    if (!CacheInvalidator.instance) {
      CacheInvalidator.instance = new CacheInvalidator();
    }
    return CacheInvalidator.instance;
  }

  private setupInvalidationRules() {
    // Define which events invalidate which cache patterns
    this.invalidationRules.set('station_created', [
      'stations:*',
      'dashboard_stats:*',
      'pumps:*', // Station creation might affect pump queries
    ]);

    this.invalidationRules.set('station_updated', [
      'stations:*',
      'dashboard_stats:*',
      'pumps:*',
    ]);

    this.invalidationRules.set('station_deleted', [
      'stations:*',
      'dashboard_stats:*',
      'pumps:*',
      'sales_data:*', // Might affect sales queries
    ]);

    this.invalidationRules.set('pump_created', [
      'pumps:*',
      'dashboard_stats:*',
      'stations:*', // Station metrics might change
    ]);

    this.invalidationRules.set('pump_updated', [
      'pumps:*',
      'dashboard_stats:*',
      'stations:*',
    ]);

    this.invalidationRules.set('pump_deleted', [
      'pumps:*',
      'dashboard_stats:*',
      'stations:*',
    ]);

    this.invalidationRules.set('sale_created', [
      'sales_data:*',
      'dashboard_stats:*',
      'payment_breakdown:*',
      'fuel_breakdown:*',
    ]);

    this.invalidationRules.set('nozzle_reading_created', [
      'dashboard_stats:*',
      'sales_data:*',
    ]);
  }

  async invalidateByEvent(event: string, tenantId?: string): Promise<void> {
    const patterns = this.invalidationRules.get(event);
    if (!patterns) {
      return;
    }

    for (const pattern of patterns) {
      const searchPattern = tenantId ? `${pattern}tenant:${tenantId}*` : pattern;
      await this.invalidateByPattern(searchPattern);
    }
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  async invalidateByKey(key: string): Promise<void> {
    try {
      await redis.del(key);
      console.log(`Invalidated cache key: ${key}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  async invalidateByTenant(tenantId: string): Promise<void> {
    await this.invalidateByPattern(`*tenant:${tenantId}*`);
  }
}

// Export invalidator instance
export const cacheInvalidator = CacheInvalidator.getInstance();

// Middleware to trigger cache invalidation based on mutations
export function createInvalidationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only handle mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Store original res.json to intercept successful responses
    const originalJson = res.json.bind(res);
    
    res.json = function(data: any) {
      // Only invalidate on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const tenantId = req.user?.tenantId;
        
        // Determine event type based on route and method
        const route = req.route?.path || req.path;
        const method = req.method;
        
        let event: string | null = null;
        
        if (route.includes('/stations')) {
          if (method === 'POST') event = 'station_created';
          else if (method === 'PUT' || method === 'PATCH') event = 'station_updated';
          else if (method === 'DELETE') event = 'station_deleted';
        } else if (route.includes('/pumps')) {
          if (method === 'POST') event = 'pump_created';
          else if (method === 'PUT' || method === 'PATCH') event = 'pump_updated';
          else if (method === 'DELETE') event = 'pump_deleted';
        } else if (route.includes('/sales')) {
          if (method === 'POST') event = 'sale_created';
        } else if (route.includes('/nozzle-readings')) {
          if (method === 'POST') event = 'nozzle_reading_created';
        }

        // Trigger invalidation
        if (event) {
          cacheInvalidator.invalidateByEvent(event, tenantId || undefined).catch(err => {
            console.error('Cache invalidation error:', err);
          });
        }
      }

      return originalJson(data);
    };

    next();
  };
}

// Rate limiting with Redis
export function createRateLimitMiddleware(options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = options.keyGenerator 
        ? options.keyGenerator(req)
        : `rate_limit:${req.ip}:${req.user?.tenantId || 'anonymous'}`;

      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, Math.ceil(options.windowMs / 1000));
      }

      if (current > options.maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: await redis.ttl(key),
        });
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': options.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, options.maxRequests - current).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + options.windowMs).toISOString(),
      });

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Continue without rate limiting on error
      next();
    }
  };
}

// Cache warming utility
export async function warmCache(routes: string[], tenantId?: string) {
  console.log('Starting cache warming...');
  
  for (const route of routes) {
    try {
      // This would typically make internal requests to warm the cache
      // Implementation depends on your specific setup
      console.log(`Warming cache for route: ${route}`);
    } catch (error) {
      console.error(`Cache warming failed for route ${route}:`, error);
    }
  }
  
  console.log('Cache warming completed');
}

// Cache statistics
export async function getCacheStats(): Promise<{
  totalKeys: number;
  memoryUsage: string;
  hitRate?: number;
}> {
  try {
    const info = await redis.info('memory');
    const keyCount = await redis.dbsize();
    
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

    return {
      totalKeys: keyCount,
      memoryUsage,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalKeys: 0,
      memoryUsage: 'unknown',
    };
  }
}

// Report-specific cache invalidation
export const invalidateReportCache = async (tenantId: string, reportType?: string): Promise<void> => {
  try {
    const patterns = [
      `report_*:tenant:${tenantId}:*`, // All reports for tenant
      `dashboard_*:tenant:${tenantId}:*`, // Dashboard data that affects reports
    ];

    if (reportType) {
      patterns.push(`report_${reportType}:tenant:${tenantId}:*`);
    }

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`[CACHE] Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
    }

    console.log(`[CACHE] Invalidated report cache for tenant ${tenantId}, type: ${reportType || 'all'}`);
  } catch (error) {
    console.error('[CACHE] Error invalidating report cache:', error);
  }
};

// Auto-invalidation on data changes
export const invalidateOnSalesUpdate = async (tenantId: string, stationId?: string): Promise<void> => {
  const patterns = [
    `report_sales:tenant:${tenantId}:*`,
    `report_financial:tenant:${tenantId}:*`,
    `dashboard_*:tenant:${tenantId}:*`,
  ];

  if (stationId) {
    patterns.push(`*:tenant:${tenantId}:stationId:${stationId}:*`);
  }

  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  console.log(`[CACHE] Invalidated sales-related cache for tenant ${tenantId}, station: ${stationId || 'all'}`);
};
