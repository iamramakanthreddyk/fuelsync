# STEP\_2\_10\_COMMAND.md — Plan Enforcement and Limits Middleware

## ✅ Project Context Summary

FuelSync Hub enforces tenant-specific limits via plan configurations: station count, pump/nozzle limits, employee caps, feature access, etc. This step implements runtime plan validation.

## 📌 Prior Steps Implemented

* ✅ `STEP_2_9`: Auth, JWT, Role-based Access Middleware
* ✅ All domain APIs and models for sales, credit, reconciliation, etc.

## 🚧 What to Build Now

### 1. Plan Context Loader

* Middleware `loadPlanConfig()`

  * Fetch current tenant's plan from `public.plans`
  * Attach to `req.planConfig`

### 2. Limit Guards

* `checkStationLimit`
* `checkPumpLimit`
* `checkNozzleLimit`
* `checkEmployeeLimit`
* `checkFeatureEnabled('creditors' | 'reports' | 'apiAccess')`

### 3. Apply Middleware

* Inject guards into corresponding `create*` routes

  ```ts
  authenticateJWT → loadPlanConfig → checkStationLimit → handler
  ```

## 📁 File Paths

```
src/
├── middleware/plan.middleware.ts
├── utils/plan.utils.ts
```

## 🧠 Why This Step

Enables metered feature access and prevents abuse beyond plan limits.

## 🧾 Docs To Update

* `CHANGELOG.md`: Feature — Plan-based access guards
* `PHASE_2_SUMMARY.md`: Add enforcement module
* `IMPLEMENTATION_INDEX.md`: Add STEP\_2\_10
* `PLANS.md`: Describe limits and flags
* `BUSINESS_RULES.md`: Add enforcement rules
