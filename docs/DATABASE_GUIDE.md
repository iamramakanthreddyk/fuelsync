# DATABASE\_GUIDE.md — FuelSync Hub Schema Overview

This guide documents the database structure, key constraints, naming patterns, and design philosophy.

---

## 🧱 Schema Model

| Schema  | Purpose                                      |
| ------- | -------------------------------------------- |
| public  | SuperAdmin config: tenants, plans, logs      |
| tenantX | Per-tenant isolation: stations, pumps, nozzles, readings, sales |

---

## 📐 Naming Conventions

* Tables: `snake_case_plural` → `stations`, `creditors`
* Primary Key: `id UUID PRIMARY KEY`
* Foreign Keys: `snake_case_id` → `tenant_id`, `station_id`
* Timestamps: `created_at`, `updated_at` (default `NOW()`)

---

## 🔗 Foreign Key Patterns

| Table             | FK References               |
| ----------------- | --------------------------- |
| `pumps`           | `stations(id)`              |
| `nozzles`         | `pumps(id)`                 |
| `sales`           | `nozzles(id)`, `nozzle_readings(id)`, `users(id)`, `creditors(id)` |
| `user_stations`   | `users(id)`, `stations(id)` |
| `credit_payments` | `creditors(id)`             |
| `fuel_deliveries` | `stations(id)`              |
| `fuel_inventory`  | `stations(id)`              |
| `day_reconciliations` | `stations(id)`          |

All constraints are `ON DELETE CASCADE`.

---
## 📝 Audit Fields & Data Constraints

All tenant tables include `created_at` and `updated_at` columns with `NOW()` defaults. Business rules are enforced with `NOT NULL` and `CHECK` constraints. Example checks include `reading > 0`, `price_per_litre > 0`, and `credit_limit >= 0`. Stations are unique per tenant and daily reconciliations enforce a unique `(station_id, reconciled_on)` pair.


## ⚠️ Constraint Notes

* No triggers for enforcing entity existence (use app logic)
* `fuel_prices` table stores `fuel_type`, price and effective date range
* `CHECK(price > 0)` on `fuel_prices`
* Optional trigger snippet to close previous price period when inserting new row
* Sales volume auto-calculated via nozzle delta logic
* Fuel inventory updated by deliveries and sales entries
* Optional plan limit constraints defined in `database/plan_constraints.sql` (commented by default)

---

## 🛠 Migration/Seed Tools

* Migrations via `migrations/` directory per schema
* Seeding via `scripts/seed-public-schema.ts` and `scripts/seed-tenant-schema.ts`
* Schema validation via `scripts/validate-tenant-schema.ts`

---

> Keep this file synchronized with the ERD and `PHASE_1_SUMMARY.md`

## 🎯 ERD: Entity Relationship Diagram

Generate the diagram locally using `python scripts/generate_erd_image.py`. The output will be saved to `docs/assets/FuelSync_ERD.png`.

### 🔑 Key Tables Overview
| Table                  | Schema    | Notes                                  |
|------------------------|-----------|----------------------------------------|
| tenants                | public    | All tenant accounts                    |
| admin_users            | public    | SuperAdmin accounts                    |
| stations               | tenant    | Belongs to tenant                      |
| pumps                  | tenant    | FK → stations                          |
| nozzles                | tenant    | FK → pumps                             |
| nozzle_readings        | tenant    | FK → nozzles, FK → users               |
| sales                  | tenant    | Delta-based transactions with payment method |
| fuel_prices            | tenant    | Per station, per fuel type             |
| creditors              | tenant    | Credit customers                       |
| credit_payments        | tenant    | Payments made on credit                |
| fuel_deliveries        | tenant    | Incoming fuel by station and type      |
| fuel_inventory         | tenant    | Current stock level per station        |
| day_reconciliations    | tenant    | Daily summary for cash, credit, cards  |
