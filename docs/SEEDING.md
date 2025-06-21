# SEEDING.md — Database Seed Strategy

This file outlines the process for populating test/demo data in FuelSync Hub across public and tenant schemas.

---

## 🌱 Goals

* Fully initialize a new environment (Dev/Test)
* Maintain idempotency — no duplicate inserts
* Test validation rules and limits

---

## 🧩 Seeding Structure

```bash
npm run db:seed        # Calls seed/index.ts
```

### Public Schema

* `createTenants()`
* `createAdminUsers()`
* `assignPlans()`

### Per Tenant Schema

* `createUsers()`
* `createStations()` → `createPumps()` → `createNozzles()`
* `insertFuelPrices()`
* `addReadings()` → triggers auto sales
* `createCreditors()` → `addCreditSales()`

---

## 🔄 Reset

```bash
npm run db:reset       # Drops & re-creates schemas
```

---

## 🧪 Validation Seed

* Use tenant: `demo-fuelco`
* Include:

  * 2 stations, 2 pumps/station, 2 nozzles/pump
  * 3 days of cumulative readings
  * 2 credit parties, 1 overdrawn

---

> After each new module (e.g., reconciliations), extend the seed script accordingly and log in `CHANGELOG.md`.
