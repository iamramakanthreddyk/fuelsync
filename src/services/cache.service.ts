/**
 * @file services/cache.service.ts
 * @description Redis caching service for FuelSync performance optimization
 */
import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';

// Redis client configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  connectTimeout: 10000,
  commandTimeout: 5000,
});

// Handle Redis connection errors gracefully
redis.on('error', (error) => {
  console.warn('[CACHE] Redis connection error:', error.message);
  console.warn('[CACHE] Continuing without cache - performance may be affected');
});

redis.on('connect', () => {
  console.log('[CACHE] Redis connected successfully');
});

redis.on('ready', () => {
  console.log('[CACHE] Redis ready for operations');
});

// Check if Redis is available
let redisAvailable = false;
redis.ping().then(() => {
  redisAvailable = true;
  console.log('[CACHE] Redis is available');
}).catch(() => {
  redisAvailable = false;
  console.warn('[CACHE] Redis is not available - running without cache');
});

// Cache key prefixes
const CACHE_PREFIXES = {
  DASHBOARD: 'dashboard',
  STATIONS: 'stations',
  PUMPS: 'pumps',
  NOZZLES: 'nozzles',
  SALES: 'sales',
  ANALYTICS: 'analytics',
  INVENTORY: 'inventory',
  PRICES: 'prices',
} as const;

// Cache durations (in seconds)
const CACHE_DURATIONS = {
  DASHBOARD: 300, // 5 minutes
  STATIONS: 1800, // 30 minutes
  PUMPS: 1800, // 30 minutes
  NOZZLES: 1800, // 30 minutes
  SALES_SUMMARY: 600, // 10 minutes
  ANALYTICS: 900, // 15 minutes
  INVENTORY: 300, // 5 minutes
  PRICES: 3600, // 1 hour
  USER_PERMISSIONS: 1800, // 30 minutes
} as const;

class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = redis;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.redis.on('connect', () => {
      console.log('[CACHE] Redis connected');
    });

    this.redis.on('error', (error) => {
      console.error('[CACHE] Redis error:', error);
    });

    this.redis.on('close', () => {
      console.log('[CACHE] Redis connection closed');
    });
  }

  // Generate cache key
  private generateKey(prefix: string, tenantId: string, ...parts: string[]): string {
    return `fuelsync:${prefix}:${tenantId}:${parts.join(':')}`;
  }

  // Get cached data
  async get<T>(prefix: string, tenantId: string, ...keyParts: string[]): Promise<T | null> {
    try {
      const key = this.generateKey(prefix, tenantId, ...keyParts);
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`[CACHE] Hit: ${key}`);
        return JSON.parse(cached);
      }
      
      console.log(`[CACHE] Miss: ${key}`);
      return null;
    } catch (error) {
      console.error('[CACHE] Get error:', error);
      return null;
    }
  }

  // Set cached data
  async set(
    prefix: string, 
    tenantId: string, 
    data: any, 
    duration: number, 
    ...keyParts: string[]
  ): Promise<void> {
    try {
      const key = this.generateKey(prefix, tenantId, ...keyParts);
      await this.redis.setex(key, duration, JSON.stringify(data));
      console.log(`[CACHE] Set: ${key} (${duration}s)`);
    } catch (error) {
      console.error('[CACHE] Set error:', error);
    }
  }

  // Delete cached data
  async delete(prefix: string, tenantId: string, ...keyParts: string[]): Promise<void> {
    try {
      const key = this.generateKey(prefix, tenantId, ...keyParts);
      await this.redis.del(key);
      console.log(`[CACHE] Deleted: ${key}`);
    } catch (error) {
      console.error('[CACHE] Delete error:', error);
    }
  }

  // Delete all cache for a tenant
  async deleteTenantCache(tenantId: string): Promise<void> {
    try {
      const pattern = `fuelsync:*:${tenantId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`[CACHE] Deleted ${keys.length} keys for tenant: ${tenantId}`);
      }
    } catch (error) {
      console.error('[CACHE] Delete tenant cache error:', error);
    }
  }

  // Invalidate related caches when data changes
  async invalidateRelated(tenantId: string, type: 'station' | 'pump' | 'nozzle' | 'sale' | 'price', id?: string): Promise<void> {
    try {
      const patterns: string[] = [];
      
      switch (type) {
        case 'station':
          patterns.push(
            `fuelsync:${CACHE_PREFIXES.DASHBOARD}:${tenantId}:*`,
            `fuelsync:${CACHE_PREFIXES.STATIONS}:${tenantId}:*`,
            `fuelsync:${CACHE_PREFIXES.ANALYTICS}:${tenantId}:*`
          );
          if (id) {
            patterns.push(`fuelsync:${CACHE_PREFIXES.PUMPS}:${tenantId}:station:${id}:*`);
          }
          break;
          
        case 'pump':
          patterns.push(
            `fuelsync:${CACHE_PREFIXES.PUMPS}:${tenantId}:*`,
            `fuelsync:${CACHE_PREFIXES.DASHBOARD}:${tenantId}:*`
          );
          if (id) {
            patterns.push(`fuelsync:${CACHE_PREFIXES.NOZZLES}:${tenantId}:pump:${id}:*`);
          }
          break;
          
        case 'nozzle':
          patterns.push(
            `fuelsync:${CACHE_PREFIXES.NOZZLES}:${tenantId}:*`,
            `fuelsync:${CACHE_PREFIXES.DASHBOARD}:${tenantId}:*`
          );
          break;
          
        case 'sale':
          patterns.push(
            `fuelsync:${CACHE_PREFIXES.DASHBOARD}:${tenantId}:*`,
            `fuelsync:${CACHE_PREFIXES.SALES}:${tenantId}:*`,
            `fuelsync:${CACHE_PREFIXES.ANALYTICS}:${tenantId}:*`,
            `fuelsync:${CACHE_PREFIXES.INVENTORY}:${tenantId}:*`
          );
          break;
          
        case 'price':
          patterns.push(
            `fuelsync:${CACHE_PREFIXES.PRICES}:${tenantId}:*`,
            `fuelsync:${CACHE_PREFIXES.DASHBOARD}:${tenantId}:*`
          );
          break;
      }
      
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          console.log(`[CACHE] Invalidated ${keys.length} keys for pattern: ${pattern}`);
        }
      }
    } catch (error) {
      console.error('[CACHE] Invalidate related error:', error);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('[CACHE] Health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Cache middleware factory
export function createCacheMiddleware(
  prefix: string,
  duration: number,
  keyGenerator?: (req: Request) => string[]
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return next();
    }

    try {
      // Generate cache key
      const keyParts = keyGenerator ? keyGenerator(req) : [req.originalUrl];
      const cached = await cacheService.get(prefix, tenantId, ...keyParts);

      if (cached) {
        return res.json(cached);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data: any) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(prefix, tenantId, data, duration, ...keyParts);
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('[CACHE] Middleware error:', error);
      next();
    }
  };
}

// Specific cache middleware instances
export const cacheMiddlewares = {
  dashboard: createCacheMiddleware(
    CACHE_PREFIXES.DASHBOARD,
    CACHE_DURATIONS.DASHBOARD,
    (req) => ['overview']
  ),
  
  stations: createCacheMiddleware(
    CACHE_PREFIXES.STATIONS,
    CACHE_DURATIONS.STATIONS,
    (req) => ['list']
  ),
  
  pumps: createCacheMiddleware(
    CACHE_PREFIXES.PUMPS,
    CACHE_DURATIONS.PUMPS,
    (req) => ['station', req.params.stationId || 'all']
  ),
  
  nozzles: createCacheMiddleware(
    CACHE_PREFIXES.NOZZLES,
    CACHE_DURATIONS.NOZZLES,
    (req) => ['pump', req.params.pumpId || 'all']
  ),
  
  salesSummary: createCacheMiddleware(
    CACHE_PREFIXES.SALES,
    CACHE_DURATIONS.SALES_SUMMARY,
    (req) => ['summary', req.query.period as string || 'today']
  ),
  
  analytics: createCacheMiddleware(
    CACHE_PREFIXES.ANALYTICS,
    CACHE_DURATIONS.ANALYTICS,
    (req) => ['report', req.params.type || 'overview']
  ),
  
  inventory: createCacheMiddleware(
    CACHE_PREFIXES.INVENTORY,
    CACHE_DURATIONS.INVENTORY,
    (req) => ['status']
  ),
  
  prices: createCacheMiddleware(
    CACHE_PREFIXES.PRICES,
    CACHE_DURATIONS.PRICES,
    (req) => ['current']
  ),
};

export { CACHE_PREFIXES, CACHE_DURATIONS };
