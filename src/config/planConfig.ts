export interface PlanRules {
  maxStations: number;
  maxPumpsPerStation: number;
  maxNozzlesPerPump: number;
  maxEmployees: number;
  enableCreditors: boolean;
  enableReports: boolean;
  enableApiAccess: boolean;
}

export const planConfig: Record<string, PlanRules> = {
  starter: {
    maxStations: 1,
    maxPumpsPerStation: 2,
    maxNozzlesPerPump: 2,
    maxEmployees: 3,
    enableCreditors: false,
    enableReports: false,
    enableApiAccess: false,
  },
  pro: {
    maxStations: 3,
    maxPumpsPerStation: 4,
    maxNozzlesPerPump: 4,
    maxEmployees: 10,
    enableCreditors: true,
    enableReports: true,
    enableApiAccess: false,
  },
  enterprise: {
    maxStations: Infinity,
    maxPumpsPerStation: Infinity,
    maxNozzlesPerPump: Infinity,
    maxEmployees: Infinity,
    enableCreditors: true,
    enableReports: true,
    enableApiAccess: true,
  },
};

export function getPlanRules(planId: string): PlanRules {
  return planConfig[planId] || planConfig.starter;
}
