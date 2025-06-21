# CHANGELOG.md — FuelSync Hub Implementation Log

This file captures every change made during implementation, categorized by type:

* 🟩 Features: New functionality, modules, endpoints, or schema
* 🟦 Enhancements: Improvements to existing logic or structure
* 🟥 Fixes: Bug corrections or adjustments to align with business rules

Each entry is tied to a step from the implementation index.

---

## [Setup - Step 0] – Environment Bootstrap

**Status:** ✅ Done

### 🟩 Features

* Initialize Node project with TypeScript support
* Provide sample `.env` and `.gitignore`
* Add scripts for migrations and seeding

### Files

* `package.json`
* `tsconfig.json`
* `.env`
* `.gitignore`


## \[Phase 1 - Step 1.1] – Public Schema Migration

**Status:** ✅ Done

### 🟩 Features

* Create `plans`, `tenants`, `admin_users` and `admin_activity_logs` tables
* Use UUID primary keys and timestamp fields
* Provide seed script for demo plans, admin user and tenant

### Files

* `migrations/001_create_public_schema.sql`
* `scripts/seed-public-schema.ts`

---

## \[Phase 1 - Step 1.2] – Tenant Schema Template

**Status:** ✅ Done

### 🟩 Features

* Create tenant-level tables: `users`, `stations`, `pumps`, `nozzles`, `sales`, `creditors`, etc.
* Enforce FK constraints, UUIDs, and soft delete fields
* Provide seed script to create a demo tenant schema

### Files

* `tenant_schema_template.sql`
* `scripts/seed-tenant-schema.ts`

---

## \[Phase 1 - Step 1.3] – Schema Validation Script

**Status:** ✅ Done

### 🟩 Features

* CLI script validates each tenant schema against the template
* Reports missing tables, columns and type mismatches
* Exits with non-zero code when discrepancies exist

### Files

* `scripts/validate-tenant-schema.ts`

---

## \[Phase 1 - Step 1.4] – ERD Definition

**Status:** ✅ Done

### 🟩 Features

* Generated ERD diagram showing public and tenant tables
* Documented key tables in `DATABASE_GUIDE.md`

### Files

* `scripts/generate_erd_image.py`
* `docs/DATABASE_GUIDE.md`

---


## [Phase 1 - Step 1.5] – Audit Fields & Data Constraints

**Status:** ✅ Done

### 🟦 Enhancements

* Added audit timestamp columns to all tenant tables
* Introduced NOT NULL and CHECK constraints for schema integrity
* Created `scripts/check-constraints.ts` for verification

### Files

* `migrations/tenant_schema_template.sql`


## [Phase 1 - Step 1.6] – Dev/Test Tenant Seeder

**Status:** ✅ Done

### 🟩 Features

* Added `seed-demo-tenant.ts` to generate a demo tenant with users, station, pump and nozzles
* Added `reset-all-demo-tenants.ts` to drop and reseed all `demo_` schemas
* New npm scripts `seed:demo` and `reset:demo`

### Files

* `scripts/seed-demo-tenant.ts`
* `scripts/reset-all-demo-tenants.ts`
* `package.json`

---

## [Fix - 2025-06-21] – TypeScript Dependency Declarations

**Status:** ✅ Done

### 🟦 Enhancements

* Added `@types/node`, `@types/pg`, and `@types/dotenv` to development dependencies
* Updated `tsconfig.json` with Node module resolution and types
* Cleaned TypeScript warnings in `scripts/check-constraints.ts`

### Files

* `package.json`
* `tsconfig.json`
* `scripts/check-constraints.ts`
* `docs/STEP_fix_20250621.md`

## [Phase 1 - Step 1.7] – Demo Tenant Validation

**Status:** ✅ Done

### 🟩 Features

* Added `validate-demo-tenant.ts` to verify demo seed integrity
* `reset-all-demo-tenants.ts` now runs the validation after seeding

### Files

* `scripts/validate-demo-tenant.ts`
* `scripts/reset-all-demo-tenants.ts`

## [Phase 1 - Step 1.8] – Plan Limit Enforcement

**Status:** ✅ Done

### 🟩 Features

* Added `planConfig.ts` to centralise plan rules
* Implemented middleware stubs for enforcing plan limits
* Provided optional `plan_constraints.sql` for DB-level checks

### Files

* `src/config/planConfig.ts`
* `src/middleware/planEnforcement.ts`
* `database/plan_constraints.sql`

## [Phase 1 - Step 1.9] – Fuel Pricing Table

**Status:** ✅ Done

### 🟩 Features

* Added `fuel_prices` table with `fuel_type` and date range columns
* Enforced `price > 0` constraint and optional trigger snippet
* Created helper `getPriceAtTimestamp` for price lookups

### Files

* `migrations/tenant_schema_template.sql`
* `src/utils/priceUtils.ts`

## [Phase 1 - Step 1.10] – Sales Table Schema

**Status:** ✅ Done

### 🟩 Features

* Created `sales` table for per-delta transactions
* Links readings to nozzles and users with price lookup
* Stores payment method and computed amount

### Files

* `migrations/tenant_schema_template.sql`

## [Phase 1 - Step 1.11] – Creditors & Payments Schema

**Status:** ✅ Done

### 🟩 Features

* Expanded `creditors` table with balance and notes fields
* Added `credit_payments` table with payment_method and received_by columns
* Linked `sales` to `creditors` via `creditor_id`

### Files

* `migrations/tenant_schema_template.sql`

## [Phase 1 - Step 1.12] – Fuel Delivery & Inventory Schema

**Status:** ✅ Done

### 🟩 Features

* Added `fuel_deliveries` table capturing deliveries by fuel type and date
* Added `fuel_inventory` table tracking current volume per station

### Files

* `migrations/tenant_schema_template.sql`

## [Phase 1 - Step 1.13] – Daily Reconciliation Schema

**Status:** ✅ Done

### 🟩 Features

* Added `day_reconciliations` table for per-station daily summaries
* Tracks sales breakdown (cash, card, upi, credit) and outstanding credit
* Includes `finalized` flag to lock records

### Files

* `migrations/tenant_schema_template.sql`

## [Phase 1 - Step 1.14] – Admin Activity Logs Table

**Status:** ✅ Done

### 🟩 Features

* Added `admin_activity_logs` table for recording platform admin actions
* Stores target type, target id and JSONB details for each action

### Files

* `migrations/001_create_public_schema.sql`

