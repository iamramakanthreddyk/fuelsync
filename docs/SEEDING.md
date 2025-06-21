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
ts-node scripts/seed-tenant-schema.ts <tenantId> <schemaName>  # create tenant schema
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

## 🚀 Demo Tenant Population

Use the development seeder to create a demo schema with minimal data for testing.

```bash
npm run seed:demo             # seeds demo_tenant_001
npm run reset:demo            # drops all demo_ schemas and reseeds them
```

The script inserts an owner, manager and attendant user, a single station with
one pump, and two nozzles. A sample fuel price record is also created.

---

## 🧪 Validation Seed

* Use tenant: `demo-fuelco`
* Include:

  * 2 stations, 2 pumps/station, 2 nozzles/pump
  * 3 days of cumulative readings
  * 2 credit parties, 1 overdrawn

---


## ✅ Seed Validation

Run the validation script to ensure the demo tenant data is consistent:

```bash
ts-node scripts/validate-demo-tenant.ts <schema_name>
```

`reset-all-demo-tenants.ts` automatically runs this check after reseeding. The script
verifies that the three user roles exist and that stations, pumps and nozzles are correctly linked.

---

> After each new module (e.g., reconciliations), extend the seed script accordingly and log in `CHANGELOG.md`.
