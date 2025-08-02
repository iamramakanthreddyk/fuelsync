/**
 * @file config/roleBasedAccess.ts
 * @description Role-based feature access control within plan tiers
 */

export type UserRole = 'owner' | 'manager' | 'attendant' | 'superadmin';
export type PlanTier = 'starter' | 'pro' | 'enterprise';

export interface FeatureAccess {
  // Core Features
  dashboard: boolean;
  stations: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  pumps: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  nozzles: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  readings: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    viewAll: boolean; // Can see readings from other attendants
  };
  sales: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    viewAll: boolean;
  };
  cashReports: {
    view: boolean;
    create: boolean;
    edit: boolean;
    viewAll: boolean;
  };
  reconciliation: {
    view: boolean;
    perform: boolean;
    closeDay: boolean;
  };
  users: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    resetPassword: boolean;
  };
  fuelPrices: {
    view: boolean;
    edit: boolean;
  };
  inventory: {
    view: boolean;
    edit: boolean;
  };
  creditors: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  reports: {
    view: boolean;
    generate: boolean;
    schedule: boolean;
    export: boolean;
  };
  analytics: {
    view: boolean;
    advanced: boolean;
  };
  settings: {
    view: boolean;
    edit: boolean;
  };
}

// Map existing plans to tiers based on schema analysis
const PLAN_NAME_TO_TIER: Record<string, PlanTier> = {
  'Regular': 'starter',  // $499, 1 station
  'Premium': 'pro',      // $999, 3 stations
  'Enterprise': 'enterprise' // Future plan
};

/**
 * Get plan tier from plan name
 */
export function getPlanTierFromName(planName: string): PlanTier {
  return PLAN_NAME_TO_TIER[planName] || 'starter';
}

/**
 * Role-based access matrix for each plan tier
 */
export const ROLE_ACCESS_MATRIX: Record<PlanTier, Record<UserRole, FeatureAccess>> = {
  starter: {
    owner: {
      dashboard: true,
      stations: { view: true, create: true, edit: true, delete: false }, // Limited delete
      pumps: { view: true, create: true, edit: true, delete: false },
      nozzles: { view: true, create: true, edit: true, delete: false },
      readings: { view: true, create: true, edit: true, delete: false, viewAll: true },
      sales: { view: true, create: true, edit: true, delete: false, viewAll: true },
      cashReports: { view: true, create: true, edit: true, viewAll: true },
      reconciliation: { view: true, perform: true, closeDay: true },
      users: { view: true, create: true, edit: true, delete: false, resetPassword: true },
      fuelPrices: { view: true, edit: true },
      inventory: { view: true, edit: true },
      creditors: { view: false, create: false, edit: false, delete: false }, // No creditors
      reports: { view: false, generate: false, schedule: false, export: false }, // No reports
      analytics: { view: false, advanced: false }, // No analytics
      settings: { view: true, edit: true }
    },
    manager: {
      dashboard: true,
      stations: { view: true, create: false, edit: true, delete: false },
      pumps: { view: true, create: false, edit: true, delete: false },
      nozzles: { view: true, create: false, edit: true, delete: false },
      readings: { view: true, create: true, edit: true, delete: false, viewAll: true },
      sales: { view: true, create: true, edit: true, delete: false, viewAll: true },
      cashReports: { view: true, create: true, edit: true, viewAll: true },
      reconciliation: { view: true, perform: true, closeDay: true },
      users: { view: true, create: false, edit: false, delete: false, resetPassword: false },
      fuelPrices: { view: true, edit: true },
      inventory: { view: true, edit: true },
      creditors: { view: false, create: false, edit: false, delete: false },
      reports: { view: false, generate: false, schedule: false, export: false },
      analytics: { view: false, advanced: false },
      settings: { view: true, edit: false }
    },
    attendant: {
      dashboard: true,
      stations: { view: true, create: false, edit: false, delete: false },
      pumps: { view: true, create: false, edit: false, delete: false },
      nozzles: { view: true, create: false, edit: false, delete: false },
      readings: { view: true, create: true, edit: true, delete: false, viewAll: false }, // Own only
      sales: { view: true, create: true, edit: false, delete: false, viewAll: false },
      cashReports: { view: true, create: true, edit: true, viewAll: false },
      reconciliation: { view: false, perform: false, closeDay: false },
      users: { view: false, create: false, edit: false, delete: false, resetPassword: false },
      fuelPrices: { view: true, edit: false },
      inventory: { view: true, edit: false },
      creditors: { view: false, create: false, edit: false, delete: false },
      reports: { view: false, generate: false, schedule: false, export: false },
      analytics: { view: false, advanced: false },
      settings: { view: false, edit: false }
    },
    superadmin: {
      dashboard: true,
      stations: { view: true, create: true, edit: true, delete: true },
      pumps: { view: true, create: true, edit: true, delete: true },
      nozzles: { view: true, create: true, edit: true, delete: true },
      readings: { view: true, create: true, edit: true, delete: true, viewAll: true },
      sales: { view: true, create: true, edit: true, delete: true, viewAll: true },
      cashReports: { view: true, create: true, edit: true, viewAll: true },
      reconciliation: { view: true, perform: true, closeDay: true },
      users: { view: true, create: true, edit: true, delete: true, resetPassword: true },
      fuelPrices: { view: true, edit: true },
      inventory: { view: true, edit: true },
      creditors: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, generate: true, schedule: true, export: true },
      analytics: { view: true, advanced: true },
      settings: { view: true, edit: true }
    }
  },
  
  pro: {
    owner: {
      dashboard: true,
      stations: { view: true, create: true, edit: true, delete: true },
      pumps: { view: true, create: true, edit: true, delete: true },
      nozzles: { view: true, create: true, edit: true, delete: true },
      readings: { view: true, create: true, edit: true, delete: true, viewAll: true },
      sales: { view: true, create: true, edit: true, delete: true, viewAll: true },
      cashReports: { view: true, create: true, edit: true, viewAll: true },
      reconciliation: { view: true, perform: true, closeDay: true },
      users: { view: true, create: true, edit: true, delete: true, resetPassword: true },
      fuelPrices: { view: true, edit: true },
      inventory: { view: true, edit: true },
      creditors: { view: true, create: true, edit: true, delete: true }, // Creditors enabled
      reports: { view: true, generate: true, schedule: true, export: true }, // Basic reports
      analytics: { view: true, advanced: false }, // Basic analytics
      settings: { view: true, edit: true }
    },
    manager: {
      dashboard: true,
      stations: { view: true, create: true, edit: true, delete: false },
      pumps: { view: true, create: true, edit: true, delete: false },
      nozzles: { view: true, create: true, edit: true, delete: false },
      readings: { view: true, create: true, edit: true, delete: true, viewAll: true },
      sales: { view: true, create: true, edit: true, delete: true, viewAll: true },
      cashReports: { view: true, create: true, edit: true, viewAll: true },
      reconciliation: { view: true, perform: true, closeDay: true },
      users: { view: true, create: true, edit: true, delete: false, resetPassword: false },
      fuelPrices: { view: true, edit: true },
      inventory: { view: true, edit: true },
      creditors: { view: true, create: true, edit: true, delete: false },
      reports: { view: true, generate: true, schedule: false, export: true },
      analytics: { view: true, advanced: false },
      settings: { view: true, edit: false }
    },
    attendant: {
      dashboard: true,
      stations: { view: true, create: false, edit: false, delete: false },
      pumps: { view: true, create: false, edit: false, delete: false },
      nozzles: { view: true, create: false, edit: false, delete: false },
      readings: { view: true, create: true, edit: true, delete: false, viewAll: false },
      sales: { view: true, create: true, edit: false, delete: false, viewAll: false },
      cashReports: { view: true, create: true, edit: true, viewAll: false },
      reconciliation: { view: false, perform: false, closeDay: false },
      users: { view: false, create: false, edit: false, delete: false, resetPassword: false },
      fuelPrices: { view: true, edit: false },
      inventory: { view: true, edit: false },
      creditors: { view: true, create: false, edit: false, delete: false }, // View only
      reports: { view: false, generate: false, schedule: false, export: false },
      analytics: { view: false, advanced: false },
      settings: { view: false, edit: false }
    },
    superadmin: {
      dashboard: true,
      stations: { view: true, create: true, edit: true, delete: true },
      pumps: { view: true, create: true, edit: true, delete: true },
      nozzles: { view: true, create: true, edit: true, delete: true },
      readings: { view: true, create: true, edit: true, delete: true, viewAll: true },
      sales: { view: true, create: true, edit: true, delete: true, viewAll: true },
      cashReports: { view: true, create: true, edit: true, viewAll: true },
      reconciliation: { view: true, perform: true, closeDay: true },
      users: { view: true, create: true, edit: true, delete: true, resetPassword: true },
      fuelPrices: { view: true, edit: true },
      inventory: { view: true, edit: true },
      creditors: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, generate: true, schedule: true, export: true },
      analytics: { view: true, advanced: true },
      settings: { view: true, edit: true }
    }
  },
  
  enterprise: {
    owner: {
      dashboard: true,
      stations: { view: true, create: true, edit: true, delete: true },
      pumps: { view: true, create: true, edit: true, delete: true },
      nozzles: { view: true, create: true, edit: true, delete: true },
      readings: { view: true, create: true, edit: true, delete: true, viewAll: true },
      sales: { view: true, create: true, edit: true, delete: true, viewAll: true },
      cashReports: { view: true, create: true, edit: true, viewAll: true },
      reconciliation: { view: true, perform: true, closeDay: true },
      users: { view: true, create: true, edit: true, delete: true, resetPassword: true },
      fuelPrices: { view: true, edit: true },
      inventory: { view: true, edit: true },
      creditors: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, generate: true, schedule: true, export: true }, // All reports
      analytics: { view: true, advanced: true }, // Advanced analytics
      settings: { view: true, edit: true }
    },
    manager: {
      dashboard: true,
      stations: { view: true, create: true, edit: true, delete: true },
      pumps: { view: true, create: true, edit: true, delete: true },
      nozzles: { view: true, create: true, edit: true, delete: true },
      readings: { view: true, create: true, edit: true, delete: true, viewAll: true },
      sales: { view: true, create: true, edit: true, delete: true, viewAll: true },
      cashReports: { view: true, create: true, edit: true, viewAll: true },
      reconciliation: { view: true, perform: true, closeDay: true },
      users: { view: true, create: true, edit: true, delete: true, resetPassword: true },
      fuelPrices: { view: true, edit: true },
      inventory: { view: true, edit: true },
      creditors: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, generate: true, schedule: true, export: true },
      analytics: { view: true, advanced: true },
      settings: { view: true, edit: true }
    },
    attendant: {
      dashboard: true,
      stations: { view: true, create: false, edit: false, delete: false },
      pumps: { view: true, create: false, edit: false, delete: false },
      nozzles: { view: true, create: false, edit: false, delete: false },
      readings: { view: true, create: true, edit: true, delete: false, viewAll: false },
      sales: { view: true, create: true, edit: true, delete: false, viewAll: false }, // Can edit own
      cashReports: { view: true, create: true, edit: true, viewAll: false },
      reconciliation: { view: true, perform: false, closeDay: false }, // Can view only
      users: { view: false, create: false, edit: false, delete: false, resetPassword: false },
      fuelPrices: { view: true, edit: false },
      inventory: { view: true, edit: true }, // Can update inventory
      creditors: { view: true, create: true, edit: true, delete: false }, // Can manage creditors
      reports: { view: true, generate: false, schedule: false, export: false }, // View only
      analytics: { view: true, advanced: false }, // Basic view
      settings: { view: false, edit: false }
    },
    superadmin: {
      dashboard: true,
      stations: { view: true, create: true, edit: true, delete: true },
      pumps: { view: true, create: true, edit: true, delete: true },
      nozzles: { view: true, create: true, edit: true, delete: true },
      readings: { view: true, create: true, edit: true, delete: true, viewAll: true },
      sales: { view: true, create: true, edit: true, delete: true, viewAll: true },
      cashReports: { view: true, create: true, edit: true, viewAll: true },
      reconciliation: { view: true, perform: true, closeDay: true },
      users: { view: true, create: true, edit: true, delete: true, resetPassword: true },
      fuelPrices: { view: true, edit: true },
      inventory: { view: true, edit: true },
      creditors: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, generate: true, schedule: true, export: true },
      analytics: { view: true, advanced: true },
      settings: { view: true, edit: true }
    }
  }
};

/**
 * Get feature access for a user based on their role and plan
 */
export function getFeatureAccess(planTier: PlanTier, userRole: UserRole): FeatureAccess {
  return ROLE_ACCESS_MATRIX[planTier]?.[userRole] || ROLE_ACCESS_MATRIX.starter.attendant;
}

/**
 * Check if user has access to a specific feature
 */
export function hasFeatureAccess(
  planTier: PlanTier,
  userRole: UserRole,
  feature: string,
  action: string = 'view'
): boolean {
  const access = getFeatureAccess(planTier, userRole);
  const featurePath = feature.split('.');
  
  let current: any = access;
  for (const path of featurePath) {
    if (current[path] === undefined) return false;
    current = current[path];
  }
  
  if (typeof current === 'boolean') return current;
  if (typeof current === 'object' && current[action] !== undefined) {
    return current[action];
  }
  
  return false;
}

/**
 * Get accessible features for a user (for frontend menu generation)
 */
export function getAccessibleFeatures(planTier: PlanTier, userRole: UserRole): string[] {
  const access = getFeatureAccess(planTier, userRole);
  const features: string[] = [];
  
  // Check each feature and add to list if accessible
  Object.entries(access).forEach(([feature, permissions]) => {
    if (typeof permissions === 'boolean' && permissions) {
      features.push(feature);
    } else if (typeof permissions === 'object') {
      // Check if user has any access to this feature
      const hasAnyAccess = Object.values(permissions).some(perm => perm === true);
      if (hasAnyAccess) {
        features.push(feature);
      }
    }
  });
  
  return features;
}
