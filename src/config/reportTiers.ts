/**
 * @file config/reportTiers.ts
 * @description Report tier configuration based on subscription plans
 */

export interface ReportTier {
  name: string;
  maxRecordsPerReport: number;
  maxReportsPerDay: number;
  allowedFormats: ('csv' | 'excel' | 'pdf')[];
  allowedReportTypes: string[];
  cacheTTL: number; // Cache time in seconds
  features: {
    scheduling: boolean;
    realTimeData: boolean;
    advancedFilters: boolean;
    customFields: boolean;
    apiAccess: boolean;
  };
}

// Report tier definitions based on subscription plans
export const REPORT_TIERS: Record<string, ReportTier> = {
  starter: {
    name: 'Starter',
    maxRecordsPerReport: 0, // No reports
    maxReportsPerDay: 0,
    allowedFormats: [],
    allowedReportTypes: [],
    cacheTTL: 0,
    features: {
      scheduling: false,
      realTimeData: false,
      advancedFilters: false,
      customFields: false,
      apiAccess: false,
    }
  },
  
  pro: {
    name: 'Pro',
    maxRecordsPerReport: 5000, // 5K records max
    maxReportsPerDay: 10,
    allowedFormats: ['csv', 'excel'],
    allowedReportTypes: [
      'sales-basic',
      'financial-summary',
      'daily-summary',
      'payment-breakdown'
    ],
    cacheTTL: 1800, // 30 minutes
    features: {
      scheduling: true,
      realTimeData: false, // Historical data only
      advancedFilters: true,
      customFields: false,
      apiAccess: false,
    }
  },
  
  enterprise: {
    name: 'Enterprise',
    maxRecordsPerReport: 50000, // 50K records max
    maxReportsPerDay: 100,
    allowedFormats: ['csv', 'excel', 'pdf'],
    allowedReportTypes: [
      'sales-basic',
      'sales-detailed',
      'financial-summary',
      'financial-detailed',
      'inventory-report',
      'attendance-report',
      'reconciliation-report',
      'audit-trail',
      'performance-analytics',
      'custom-reports'
    ],
    cacheTTL: 3600, // 1 hour
    features: {
      scheduling: true,
      realTimeData: true,
      advancedFilters: true,
      customFields: true,
      apiAccess: true,
    }
  }
};

// Map plan IDs to report tiers
const PLAN_TO_TIER_MAP: Record<string, keyof typeof REPORT_TIERS> = {
  '00000000-0000-0000-0000-000000000001': 'starter',
  '00000000-0000-0000-0000-000000000002': 'pro',
  '00000000-0000-0000-0000-000000000003': 'enterprise',
};

/**
 * Get report tier configuration for a plan
 */
export function getReportTier(planId: string): ReportTier {
  const tierKey = PLAN_TO_TIER_MAP[planId] || 'starter';
  return REPORT_TIERS[tierKey];
}

/**
 * Check if a report type is allowed for a plan
 */
export function isReportTypeAllowed(planId: string, reportType: string): boolean {
  const tier = getReportTier(planId);
  return tier.allowedReportTypes.includes(reportType);
}

/**
 * Check if a format is allowed for a plan
 */
export function isFormatAllowed(planId: string, format: string): boolean {
  const tier = getReportTier(planId);
  return tier.allowedFormats.includes(format as any);
}

/**
 * Get maximum records allowed for a plan
 */
export function getMaxRecords(planId: string, requestedLimit?: number): number {
  const tier = getReportTier(planId);
  const maxAllowed = tier.maxRecordsPerReport;
  
  if (!requestedLimit) return Math.min(1000, maxAllowed); // Default 1K
  return Math.min(requestedLimit, maxAllowed);
}

/**
 * Check daily report limit
 */
export async function checkDailyReportLimit(
  db: any, 
  tenantId: string, 
  planId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const tier = getReportTier(planId);
  
  if (tier.maxReportsPerDay === 0) {
    return { allowed: false, remaining: 0 };
  }
  
  try {
    // Count reports generated today
    const today = new Date().toISOString().split('T')[0];
    const result = await db.query(
      `SELECT COUNT(*) as count FROM report_generations 
       WHERE tenant_id = $1 AND DATE(created_at) = $2`,
      [tenantId, today]
    );
    
    const todayCount = parseInt(result.rows[0]?.count || '0');
    const remaining = Math.max(0, tier.maxReportsPerDay - todayCount);
    
    return {
      allowed: remaining > 0,
      remaining
    };
  } catch (error) {
    console.error('[REPORT-TIERS] Error checking daily limit:', error);
    return { allowed: true, remaining: tier.maxReportsPerDay }; // Fail open
  }
}

/**
 * Log report generation for tracking limits
 */
export async function logReportGeneration(
  db: any,
  tenantId: string,
  reportType: string,
  recordCount: number,
  format: string
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO report_generations 
       (tenant_id, report_type, record_count, format, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [tenantId, reportType, recordCount, format]
    );
  } catch (error) {
    console.error('[REPORT-TIERS] Error logging report generation:', error);
  }
}

/**
 * Get report tier summary for frontend display
 */
export function getReportTierSummary(planId: string): {
  tierName: string;
  reportsEnabled: boolean;
  maxRecords: number;
  maxDaily: number;
  formats: string[];
  features: string[];
} {
  const tier = getReportTier(planId);
  
  const enabledFeatures = Object.entries(tier.features)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature);
  
  return {
    tierName: tier.name,
    reportsEnabled: tier.maxRecordsPerReport > 0,
    maxRecords: tier.maxRecordsPerReport,
    maxDaily: tier.maxReportsPerDay,
    formats: tier.allowedFormats,
    features: enabledFeatures
  };
}
