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
| `sales`           | `nozzles(id)`, `users(id)`  |
| `user_stations`   | `users(id)`, `stations(id)` |
| `credit_payments` | `creditors(id)`             |
| `fuel_deliveries` | `stations(id)`              |
| `fuel_inventory`  | `stations(id)`              |
| `day_reconciliations` | `stations(id)`          |

All constraints are `ON DELETE CASCADE`.

---

## ⚠️ Constraint Notes

* No triggers for enforcing entity existence (use app logic)
* `CHECK(price > 0)` on `fuel_prices`
* Sales volume auto-calculated via nozzle delta logic

---

## 🛠 Migration/Seed Tools

* Migrations via `migrations/` directory per schema
* Seeding via `scripts/seed-public-schema.ts` and `scripts/seed-tenant-schema.ts`
* Schema validation via `scripts/validate-tenant-schema.ts`

---

> Keep this file synchronized with the ERD and `PHASE_1_SUMMARY.md`
