# PLANS.md — FuelSync Hub Tenant Plans

This file defines the pricing plans and their effect on feature availability and data limits.

---

## 📦 Plan Tiers

| Plan Name  | maxStations | maxPumpsPerStation | maxNozzlesPerPump | maxEmployees | enableCreditors | enableReports | enableApiAccess |
| ---------- | ----------- | ------------------ | ----------------- | ------------ | --------------- | ------------- | --------------- |
| Starter    | 1           | 2                  | 2                 | 3            | false           | false         | false           |
| Pro        | 3           | 4                  | 4                 | 10           | true            | true          | false           |
| Enterprise | ∞           | ∞                  | ∞                 | ∞            | true            | true          | true            |

---

## ⚙️ Runtime Evaluation

* Each plan is stored in the `public.plans` table
* Plan configuration read via `planConfig.ts`
* Used in backend middleware and frontend route guards

---

## 🧪 Enforcement Examples

* Block new station if `count(stations)` ≥ `plan.maxStations`
* Disable `/creditors` routes if `!plan.enableCreditors`

---

> After modifying `planConfig.ts` or DB plan settings, update this file and regenerate documentation.
