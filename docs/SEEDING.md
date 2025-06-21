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
npm run ts-node scripts/seed-tenant-sample.ts demo_tenant_001  # extended sample
npm run reset:demo            # drops all demo_ schemas and reseeds them
```

The script inserts an owner, manager and attendant user, a single station with
one pump, two nozzles, and an initial fuel price. The extended sample script also
adds basic user activity log entries.

---

## Seed Helper Utilities

Use the utility functions added in Step 1.17 to script custom seeds. Example:

```ts
import { Client } from 'pg';
import {
  createTenant,
  createStation,
  createPump,
  createNozzles,
} from '../src/utils/seedHelpers';

async function run() {
  const client = new Client();
  await client.connect();

  const planId = (await client.query<{ id: string }>("SELECT id FROM public.plans LIMIT 1")).rows[0].id;
  const tenantId = await createTenant(client, { name: 'sample', schemaName: 'sample_schema', planId });
  const stationId = await createStation(client, 'sample_schema', tenantId, { name: 'Station A' });
  const pumpId = await createPump(client, 'sample_schema', stationId, tenantId, { name: 'Pump 1' });
  await createNozzles(client, 'sample_schema', pumpId, tenantId, [
    { nozzleNumber: 1, fuelType: 'petrol' },
    { nozzleNumber: 2, fuelType: 'diesel' },
  ]);

  await client.end();
}

run();
```

These helpers keep seed scripts concise and ensure each insert respects the tenant schema context.

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

After seeding, run the schema validation script to confirm each tenant matches the latest template:

```bash
ts-node scripts/validate-tenant-schema.ts
```

This will report any missing tables, columns or foreign key issues.
