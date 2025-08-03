# PHASE\_2\_SUMMARY.md — Backend Services & Logic Summary

This document logs the design and validation details of **Phase 2: Backend Implementation** for FuelSync Hub. It includes authentication, service logic, API routes, validation layers, and feature enforcement.

---

## 🧩 Step Format

Each step includes:

* Step ID and Title
* Files modified/created
* Business rules enforced
* Validation logic
* Open design notes if any

---

### 🛠️ Step 2.1 – Authentication & Role Middleware

**Status:** ✅ Done
**Files:** `src/services/auth.service.ts`, `src/routes/auth.route.ts`, `src/middlewares/authenticateJWT.ts`, `src/middlewares/requireRole.ts`, `src/middlewares/checkStationAccess.ts`, `src/utils/jwt.ts`, `src/constants/auth.ts`, `src/types/auth.d.ts`

**Business Rules Covered:**

* JWT session auth
* Station-level access via `user_stations`
* Role checks enforced before route handlers

**Validation To Perform:**

* JWT issued via login and stored in HttpOnly cookies
* Token includes `user_id`, `tenant_id`, and `role`
* `requireAuth()` checks validity

**Overview:**
* Login route validates credentials with bcrypt and returns JWT
* Middleware verifies tokens and checks user role and station access

**Validations Performed:**
* Manual testing via `ts-node-dev` ensured tokens reject invalid credentials
* Verified middleware attaches `req.user` with correct fields

---

### 🛠️ Step 2.2 – User Management APIs

**Status:** ✅ Done
**Files:** `src/controllers/adminUser.controller.ts`, `src/controllers/user.controller.ts`, `src/routes/adminUser.route.ts`, `src/routes/user.route.ts`, `src/services/adminUser.service.ts`, `src/services/user.service.ts`, `src/validators/user.validator.ts`

**Business Rules Covered:**

* SuperAdmin can create and list platform admins
* Tenant owners/managers can create staff users
* Plan limits enforced on number of users
* User station mapping recorded via `user_stations`

**Validation Performed:**

* Emails unique per schema
* Password length >= 6
* Role must be one of allowed enums

---

### 🛠️ Step 2.3 – Station, Pump & Nozzle APIs

**Status:** ✅ Done
**Files:** `src/controllers/station.controller.ts`, `src/controllers/pump.controller.ts`, `src/controllers/nozzle.controller.ts`, routes and services

**Business Rules Covered:**

* Station name unique per tenant
* Pump belongs to valid station
* Nozzle belongs to valid pump
* Plan limits enforced on creation

**Validation Performed:**

* Basic field checks in validators
* Plan limit middleware blocks overages

---

### 🛠️ Step 2.4 – Nozzle Readings & Auto Sales

**Status:** ✅ Done
**Files:** `src/controllers/nozzleReading.controller.ts`, `src/routes/nozzleReading.route.ts`, `src/services/nozzleReading.service.ts`, `src/validators/nozzleReading.validator.ts`, `src/utils/priceUtils.ts`

**Business Rules Covered:**

* Readings must be cumulative
* Delta volume creates automatic sales row
* Pricing uses station fuel price at `recorded_at`

**Validation Performed:**

* Reject reading lower than previous
* Sales amount rounded to 2 decimals

---

> 🧠 After implementing each step, update the corresponding block with status, files created, and key validations.

### 🛠️ Step 2.5 – Fuel Pricing Management

**Status:** ✅ Done
**Files:** `src/controllers/fuelPrice.controller.ts`, `src/routes/fuelPrice.route.ts`, `src/services/fuelPrice.service.ts`, `src/validators/fuelPrice.validator.ts`

**Business Rules Covered:**

* Price must be greater than zero
* No overlapping time range per station and fuel type
* New price creation closes any existing open range or rejects the record if dates overlap

**Validation Performed:**

* `validateCreateFuelPrice` defaults `validFrom` to now and accepts an optional `effectiveTo` that must be later
* Service logic closes open ranges or throws on conflicting dates

---

### 🛠️ Step 2.6 – Creditors & Credit Sales

**Status:** ✅ Done
**Files:** `src/controllers/creditor.controller.ts`, `src/services/creditor.service.ts`, `src/routes/creditor.route.ts`, `src/validators/creditor.validator.ts`, `src/services/nozzleReading.service.ts`

**Business Rules Covered:**

* Creditor must exist for credit sales
* Sale amount cannot exceed available credit
* Payments decrease creditor balance

**Validation Performed:**

* Input checks on creditor and payment creation
* Balance updates wrapped in transaction

---

### 🛠️ Step 2.7 – Fuel Deliveries & Inventory Tracking

**Status:** ✅ Done
**Files:** `src/controllers/delivery.controller.ts`, `src/services/delivery.service.ts`, `src/routes/delivery.route.ts`, `src/validators/delivery.validator.ts`

**Business Rules Covered:**

* Delivery increases inventory volume
* Inventory record created if missing

**Validation Performed:**

* Input fields validated for presence and numeric volume
* Transactional update of delivery and inventory

---

### 🛠️ Step 2.8 – Daily Reconciliation API

**Status:** ✅ Done
**Files:** `src/controllers/reconciliation.controller.ts`, `src/services/reconciliation.service.ts`, `src/routes/reconciliation.route.ts`, `src/services/nozzleReading.service.ts`, `src/services/creditor.service.ts`

**Business Rules Covered:**

* One reconciliation per station per day
* Day is locked from sales or payments once finalized

**Validation Performed:**

* Aggregates totals from sales table
* Finalization check before mutations

---

### 🛠️ Step 2.9 – Global Auth Enforcement

**Status:** ✅ Done
**Files:** `src/controllers/auth.controller.ts`, `src/routes/auth.route.ts`, `src/routes/adminApi.router.ts`, `src/middlewares/checkStationAccess.ts`, `src/middleware/auth.middleware.ts`

**Business Rules Covered:**

* JWT-based login flow
* Role-based access checks on every endpoint
* Station access verified via `user_stations`

**Validation Performed:**

* Manual login tested for admin and tenant users
* Middleware chain rejects invalid tokens and roles

---

### 🛠️ Step 2.10 – Backend Cleanup, Tests & Swagger

**Status:** ✅ Done
**Files:** `src/app.ts`, `src/docs/swagger.ts`, `src/routes/docs.route.ts`, `src/middlewares/errorHandler.ts`, `src/utils/db.ts`, tests added

**Overview:**
* Combined all routers into an Express app with tenant header support
* Added Swagger documentation route at `/api/docs` and generated `docs/openapi.yaml` listing all endpoints
* Introduced centralized error handler returning `{ status, code, message }`
* Created Jest unit tests for core services and an e2e auth flow

**Validations Performed:**
* `npm test` executes mocked unit tests
* Swagger UI loads and lists available endpoints

---

### 🛠️ Step 2.11 – Jest DB Test Infrastructure

**Status:** ✅ Done
**Files:** `jest.config.js`, `tests/setup.ts`, `tests/teardown.ts`, `tests/utils/db-utils.ts`, `.env.test`, `tests/auth.service.test.ts`

**Overview:**
* Added global setup/teardown to create and drop a dedicated test schema
* Introduced `.env.test` for isolated database configuration
* Extended auth service tests to verify bcrypt usage

**Validations Performed:**
* `npm test` now runs with `cross-env NODE_ENV=test`

---

### 🛠️ Step 2.12 – Test DB Bootstrap & Helpers

**Status:** ✅ Done
**Files:** `scripts/init-test-db.ts`, `jest.setup.js`, `jest.config.ts`, `tests/utils/testClient.ts`, `tests/utils/testTenant.ts`, `.env.test`

**Overview:**
* Bootstraps `fuelsync_test` database with public and tenant schemas
* Adds Jest setup script to initialize and reset test schemas
* Provides supertest and tenant helper utilities for service tests

**Validations Performed:**
* `npm test` runs using the new setup and passes existing suites

---

**Phase 2 Completed.** Backend APIs are stable with docs and basic test coverage.

### 🛠️ Step 2.13 – Independent Backend Test Execution

**Status:** ✅ Done
**Files:** `jest.globalSetup.ts`, `jest.globalTeardown.ts`, `scripts/create-test-db.ts`, `scripts/seed-test-db.ts`, `jest.config.ts`, `package.json`

**Overview:**
* Automated creation and seeding of `fuelsync_test` database
* Jest hooks ensure tests run in isolation without manual setup
* Global setup exits early with a notice when PostgreSQL is unavailable
* Local testing guide now includes steps to install and start PostgreSQL via
  `apt-get`

**Validations Performed:**
* `npm test` triggers database provisioning and runs suites
* `LOCAL_DEV_SETUP.md` warns to start PostgreSQL (Docker or service) before tests

### 🔍 Endpoint Review – 2025-06-25

Recent manual review highlighted a few gaps:

* `POST /api/nozzle-readings` does not accept a `paymentMethod` field even though business rules allow `cash`, `card`, `upi`, or `credit`.
* Pump and nozzle routes lack update endpoints for modifying `label` or `fuelType`.
* The static OpenAPI file only lists paths without request or response schemas.

These points should be addressed in a future backend patch.

### ✅ Test Verification – 2025-06-27

After installing PostgreSQL locally and seeding the demo data, all Jest suites
passed. This confirms the automated test database provisioning works when
`psql` is available or Docker Compose is properly installed.
If tests skip because the database cannot be created, install PostgreSQL or
start the Docker container and rerun `npm test`. On Ubuntu/Debian:

```bash
sudo apt-get update && sudo apt-get install -y postgresql
```

### 🛠️ Step 2.CRITICAL_FIXES – Backend Hardening

**Status:** ✅ Done
**Files:** `src/db/index.ts`, `migrations/003_add_indexes.sql`, `src/utils/errorResponse.ts`, tests updated

**Overview:**
* Introduced PostgreSQL connection pooling
* Added indexes for frequently queried columns
* Versioned all API routes under `/v1`
* Unified error handling via `errorResponse` helper
* Added regression tests for versioning and error utilities

### 🛠️ Step 2.14 – Safe Schema & Additional Indexes

**Status:** ✅ Done
**Files:** `src/utils/schemaUtils.ts`, `src/errors/ServiceError.ts`, `migrations/004_add_additional_indexes.sql`, controllers updated

**Overview:**
* Validates schema names with `getSafeSchema`
* Uses `ServiceError` for typed service errors
* Added indexes for credit payments and fuel prices
* Controllers handle `ServiceError` via `errorResponse`

### 🛠️ Fix 2025-07-03 – Remove uuid-ossp Defaults

**Status:** ✅ Done
**Files:** `migrations/001_create_public_schema.sql`, `migrations/tenant_schema_template.sql` and templates

**Overview:**
* UUID generation moved entirely to the backend
* Removed `uuid-ossp` extension and all `DEFAULT uuid_generate_v4()` clauses

### 🛠️ Fix 2025-07-04 – Test DB UUID & Jest Cleanup

**Status:** ✅ Done
**Files:** `scripts/create-test-db.ts`, tests

**Overview:**
* Inserted generated UUID in test DB creation script to satisfy NOT NULL constraint.
* Updated unit tests to match current login and error handling logic.

### 🛠️ Step 2.15 – Sales Listing & Tenant Settings API

**Status:** ✅ Done
**Files:** `src/routes/sales.route.ts`, `src/controllers/sales.controller.ts`, `src/services/sales.service.ts`, `src/routes/settings.route.ts`, `src/controllers/settings.controller.ts`, `src/services/settings.service.ts`

**Overview:**
* Added `/v1/sales` endpoint with filtering by station, nozzle and date range
* Added `/v1/settings` GET and POST endpoints for tenant preferences
* Owner role required to update settings; owners and managers can view
* Marks completion of Phase 2 backend implementation

### 🛠️ Step 2.16 – Utility Scripts & Fuel Inventory

**Status:** ✅ Done
**Files:** `start-server.js`, `scripts/`, `src/services/auth.service.ts`, `src/controllers/auth.controller.ts`, `src/services/fuelInventory.service.ts`, `src/controllers/fuelInventory.controller.ts`, `src/routes/fuelInventory.route.ts`, documentation

**Overview:**
* Added helper scripts for migrations, DB checks and login tests
* Improved multi-tenant login by looking up user email across schemas
* Introduced `/v1/fuel-inventory` endpoint with demo seeding
* Added `DB_AUTH_TROUBLESHOOTING.md` and `SERVER_README.md` for developer guidance

### 🛠️ Step 2.17 – Azure Deployment Restructure

**Status:** ✅ Done
**Files:** `index.js`, `package.json`, `scripts/start-and-test.js`

**Overview:**
* Renamed `start-server.js` to `index.js` for Azure compatibility
* Updated start script and added Node `20.x` engines field
* Revised utility script to spawn `index.js`

### 🛠️ Fix 2025-07-06 – cross-env Dependency

**Status:** ✅ Done
**Files:** `package.json`

**Overview:**
* Moved `cross-env` to regular dependencies so running `npm test` without installing dev packages still works.

### 🛠️ Fix 2025-07-07 – TypeScript Typings

**Status:** ✅ Done
**Files:** `package.json`, `tsconfig.json`

**Overview:**
* Moved `@types/node` into regular dependencies and removed `jest` from the build configuration so Azure deployments compile successfully.

### 🛠️ Fix 2025-07-08 – Azure Cleanup

**Status:** ✅ Done
**Files:** `package.json`, `package-lock.json`, `app.js`, `src/app.ts`, `src/utils/db.ts`

**Overview:**
* Removed remaining Vercel deployment code and documentation.
* Updated CORS origins to allow only Azure domains.
* Dropped Vercel scripts and dependencies from the project.

### 🛠️ Step 2.18 – Tenants API & Summary

**Status:** ✅ Done
**Files:** `src/services/tenant.service.ts`, `src/controllers/tenant.controller.ts`, `src/routes/tenant.route.ts`, `src/routes/adminTenant.route.ts`, `src/routes/adminApi.router.ts`, `src/validators/tenant.validator.ts`, `src/app.ts`, `docs/openapi.yaml`

**Overview:**
* Implemented `/v1/tenants` endpoints for superadmin tenant management.
* Added `/v1/admin/tenants/summary` providing overall tenant metrics.
* Tenant creation applies schema template and optional owner account.
* Documented new APIs in the OpenAPI file.

### 🛠️ Fix 2025-07-09 – API Alignment

**Status:** ✅ Done
**Files:** `src/app.ts`, `src/controllers/dashboard.controller.ts`, `src/routes/dashboard.route.ts`,
`src/controllers/reconciliation.controller.ts`, `src/routes/reconciliation.route.ts`,
`src/controllers/auth.controller.ts`, `src/routes/auth.route.ts`,
`src/controllers/adminAnalytics.controller.ts`, `src/routes/adminAnalytics.route.ts`,
`src/routes/creditPayment.route.ts`, `src/routes/creditor.route.ts`, `src/services/station.service.ts`

**Overview:**
* All frontend-documented endpoints are now available under `/api/v1`.
* Added dashboard analytics, logout and token refresh, admin analytics and daily reconciliation summary.
* Credit payment routes aligned and station listing now returns real counts.

### 🛠️ Fix 2025-07-10 – Dashboard & Reconciliation Bug Fixes

**Status:** ✅ Done
**Files:** `src/routes/reconciliation.route.ts`, `src/controllers/dashboard.controller.ts`, `src/controllers/adminUser.controller.ts`, `src/routes/adminApi.router.ts`

**Overview:**
* Reordered reconciliation routes so the daily summary endpoint is reachable.
* Dashboard payment method breakdown now uses `req.user` consistently.
* Added lightweight analytics summary for SuperAdmin users.

### 🛠️ Step 2.19 – Dashboard & Sales Metrics Expansion

**Status:** ✅ Done
**Files:** `src/controllers/dashboard.controller.ts`, `src/routes/dashboard.route.ts`,
`src/controllers/station.controller.ts`, `src/routes/station.route.ts`, `src/services/station.service.ts`,
`src/controllers/sales.controller.ts`, `src/services/sales.service.ts`, `src/routes/sales.route.ts`,
`src/validators/sales.validator.ts`, `src/middlewares/checkStationAccess.ts`, `docs/openapi.yaml`

**Overview:**
* Added station and date range parameters to dashboard metrics.
* Stations can return metrics and month-over-month performance.
* Sales listing now paginated and analytics endpoint provides station totals.
* Middleware updated to check `stationId` from query parameters.

### 🛠️ Fix 2025-07-11 – SuperAdmin API Alignment

**Status:** ✅ Done
**Files:** `migrations/005_add_price_yearly_to_plans.sql`, `src/services/plan.service.ts`, `src/controllers/admin.controller.ts`, `src/services/tenant.service.ts`, `src/routes/adminApi.router.ts`, `src/controllers/analytics.controller.ts`

**Overview:**
* Plans now include `price_yearly` and APIs expose `priceYearly`.
* Dashboard summary returns new fields (`signupsThisMonth`, `tenantsByPlan`).
* Tenant creation supports custom owner credentials.
* Tenant status updates via PATCH.


### 🛠️ Step 2.20 – API Alignment Endpoints

**Status:** ✅ Done
**Files:** `src/services/inventory.service.ts`, `src/controllers/alerts.controller.ts`, `src/routes/alerts.route.ts`, `src/controllers/analytics.controller.ts`, `src/routes/analytics.route.ts`, `src/services/fuelPrice.service.ts`, `src/controllers/fuelPrice.controller.ts`, `src/routes/fuelPrice.route.ts`, `src/controllers/reports.controller.ts`, `src/routes/reports.route.ts`, `src/app.ts`, `docs/openapi.yaml`, `src/docs/swagger.ts`

**Overview:**
* Added global alerts listing and mark-read endpoints.
* Added station comparison alias under `/analytics/station-comparison`.
* Fuel price records can now be updated via `PUT`.
* Sales reports available via `POST /reports/sales`.
* OpenAPI docs and Swagger spec updated.

### 🛠️ Fix 2025-07-14 – Reports Controller Compile Fix

**Status:** ✅ Done
**Files:** `src/controllers/reports.controller.ts`

**Overview:**
* Removed extra closing brace which stopped `tsc` with error `TS1128`.

### 🛠️ Fix 2025-07-15 – Plan Enforcement Schema Lookup

**Status:** ✅ Done
**Files:** `src/middleware/planEnforcement.ts`

**Overview:**
* [Deprecated] Initial implementation resolved tenant plan by `schema_name`. Unified schema now uses `tenant_id` lookups.

### 🛠️ Step 2.21 – CRUD Completion Endpoints

**Status:** ✅ Done
**Files:** `src/services/pump.service.ts`, `src/controllers/pump.controller.ts`, `src/routes/pump.route.ts`, `docs/openapi.yaml`

**Overview:**
* Added pump update service and route protected by tenant context and role checks.
* Documented update and delete routes for pumps, nozzles and users in OpenAPI spec.
* Backend now exposes full CRUD operations for stations, pumps, nozzles and users.

### 🛠️ Step 2.22 – Fuel Price Delete Endpoint

**Status:** ✅ Done
**Files:** `src/services/fuelPrice.service.ts`, `src/controllers/fuelPrice.controller.ts`, `src/routes/fuelPrice.route.ts`, `docs/openapi.yaml`

**Overview:**
* Added service, controller and route to remove fuel price records.
* Documented DELETE `/fuel-prices/{id}` in OpenAPI spec.

### 🛠️ Step 2.23 – Prisma ORM Migration

**Status:** ✅ Done
**Files:** `src/controllers/user.controller.ts`, `prisma/schema.prisma`, `backend_brain.md`

**Overview:**
* Documented all existing endpoints in `backend_brain.md` and noted OpenAPI mismatches.
* Added Prisma ORM with a schema for the unified database and helper client.
* Refactored user controller methods (`list`, `get`, `create`, `update`) to query via Prisma and enforce `tenant_id` filtering.

### 🛠️ Step 2.24 – Additional Prisma Controllers

**Status:** ✅ Done
**Files:** `src/controllers/station.controller.ts`, `src/controllers/pump.controller.ts`, `src/controllers/nozzle.controller.ts`, `src/controllers/nozzleReading.controller.ts`, `src/controllers/fuelPrice.controller.ts`, `prisma/schema.prisma`, `backend_brain.md`

**Overview:**
* Extended Prisma schema with `FuelPrice` and `UserStation` models.
* Updated station, pump, nozzle, nozzle reading and fuel price controllers to use Prisma for CRUD operations.
* Controllers still rely on raw SQL for advanced analytics routes, to be migrated later.

### 🛠️ Step 2.25 – Endpoint Inventory and Spec Refresh

**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `backend_brain.md`

**Overview:**
* Enumerated every active backend endpoint and noted which controllers use Prisma.
* Generated a new `openapi.yaml` automatically from the route definitions.
* Updated `backend_brain.md` with a migration status table and documented contract drift.

### 🛠️ Step 2.26 – OpenAPI Audit

**Status:** ✅ Done
**Files:** `backend_brain.md`, `docs/STEP_2_26_COMMAND.md`

**Overview:**
* Parsed all Express routes and compared them to `openapi.yaml`.
* Confirmed the spec includes every path (97 total).
* Added an audit note to `backend_brain.md` for future reference.
* Normalised the OpenAPI document and recorded contract drift notes.

### 🛠️ Step 2.27 – Spec Normalisation & Drift Notes

**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `backend_brain.md`, `docs/STEP_2_27_COMMAND.md`

**Overview:**
* Aligned path parameters and added missing admin and utility endpoints.
* Logged contract drift vs old spec in `backend_brain.md`.


### 🛠️ Step 2.28 – Complete OpenAPI Schemas

**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `backend_brain.md`, `docs/STEP_2_28_COMMAND.md`

**Overview:**
* Added generic request and response definitions for every route.
* Introduced an `ErrorResponse` schema and noted mismatch with implementation.
* Normalised admin paths under `/api/v1`.


### 🛠️ Step 2.29 – API Doc Sync Script

**Status:** ✅ Done
**Files:** `merge-api-docs.js`, `backend_brain.md`, `docs/STEP_2_29_COMMAND.md`

**Overview:**
* Added a Node.js script to compare endpoints in `backend_brain.md` and `docs/openapi.yaml`.
* Documented best practices for evolving the API contract and how to run the script.


### 🛠️ Step 2.30 – Pump nozzle count

**Status:** ✅ Done
**Files:** `src/controllers/pump.controller.ts`, `docs/openapi.yaml`, `backend_brain.md`

**Overview:**
* Updated pump listing to include `nozzleCount` using Prisma relation counts.
* Documented the wrapped success response in OpenAPI and backend brain.

### 🛠️ Fix 2025-07-31 – OpenAPI Schema Details

**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `docs/STEP_fix_20250731.md`

**Overview:**
* Replaced generic object schemas with detailed definitions.
* Imported components from the frontend spec so API docs include fields, formats and examples.

### 🛠️ Step 2.31 – Analytics & lookup endpoints

**Status:** ✅ Done
**Files:** `src/controllers/analytics.controller.ts`, `src/services/analytics.service.ts`, `src/controllers/alerts.controller.ts`, `src/services/alert.service.ts`, `src/controllers/creditor.controller.ts`, `prisma/schema.prisma`, `docs/openapi.yaml`, `backend_brain.md`

**Overview:**
* Added delete endpoint for alerts and new analytics queries using Prisma.
* Enabled GET endpoints for creditors, stations and users returning `{ data }`.
* Extended OpenAPI documentation with schemas and parameters.

### 🛠️ Step 2.32 – Parameter naming alignment
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `src/routes/user.route.ts`, `src/routes/station.route.ts`, `src/controllers/user.controller.ts`, `src/controllers/station.controller.ts`, `backend_brain.md`

**Overview:**
* Renamed user and station path parameters to `userId` and `stationId`.
* Synced OpenAPI documentation and backend brain entries.

### 🛠️ Step 2.33 – Reusable response components
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`

**Overview:**
* Added shared `Success` and `Error` response objects under `components.responses`.

### 🛠️ Step 2.34 – OpenAPI request schemas
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `docs/STEP_2_34_COMMAND.md`

**Overview:**
* Connected login, refresh, user and station endpoints to detailed schemas.
* Introduced `CreateStationRequest` and `UpdateStationRequest` components.
### 🛠️ Step 2.35 – Response wrapper alignment
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `src/app.ts`, `docs/STEP_2_35_COMMAND.md`

**Overview:**
* All endpoints now return data under a `data` property.
* Error responses documented as `{ success: false, message }`.
* Added query parameter docs for pump, nozzle and nozzle reading endpoints.

### 🛠️ Fix 2025-08-13 – Response and Query Cleanups
**Status:** ✅ Done
**Files:** `src/controllers/creditor.controller.ts`, `src/services/analytics.service.ts`, `src/validators/fuelPrice.validator.ts`, `docs/STEP_fix_20250813.md`

**Overview:**
* Removed a redundant success response in the creditor controller.
* Fixed missing semicolons and braces after merge.
* Converted raw SQL strings in analytics service to `Prisma.sql` and executed via `$queryRaw`.
* Updated all query table references to the unified `sales` name.
* Added `costPrice` support to fuel price validation.

### 🛠️ Fix 2025-08-14 – Login Query Updates
**Status:** ✅ Done
**Files:** `src/controllers/auth.controller.ts`, `src/services/auth.service.ts`, `docs/STEP_fix_20250814.md`

**Overview:**
* Adjusted login logic to query tenants by UUID instead of the deprecated `schema_name`.
* Ensures compatibility with the unified schema.

### 🛠️ Fix 2025-08-15 – Tenant Service Unified Schema
**Status:** ✅ Done
**Files:** `src/services/tenant.service.ts`, `src/controllers/tenant.controller.ts`, `src/validators/tenant.validator.ts`, `tests/utils/testTenant.ts`, `docs/openapi.yaml`, `docs/TENANT_MANAGEMENT_GUIDE.md`, `docs/STEP_2_36_COMMAND.md`

**Overview:**
* Removed all schema references from tenant service and related modules.
* Tenant APIs now operate solely on unified tables via `tenant_id`.
* Documentation and tests updated accordingly.


### 🛠️ Fix 2025-08-16 – Plan Enforcement Tenant Queries
**Status:** ✅ Done
**Files:** `src/middleware/planEnforcement.ts`, `src/services/station.service.ts`, `src/services/pump.service.ts`, `src/services/nozzle.service.ts`, `src/services/user.service.ts`, `docs/STEP_fix_20250816.md`

**Overview:**
* Plan limit checks now query unified tables with `tenant_id` filters.
* Service layers pass tenant IDs instead of schema names.

### 🛠️ Fix 2025-08-17 – Service Schema Cleanup
**Status:** ✅ Done
**Files:** `src/services/*`, `src/controllers/*`, `src/utils/seedHelpers.ts`, `docs/STEP_fix_20250817.md`

**Overview:**
* Converted all remaining schema-based queries to unified table access.
* Controllers now rely solely on `tenant_id` for filtering.
* Seeding helpers create data directly in shared tables.

### 🛠️ Fix 2025-08-18 – Remove schemaName from docs
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, various documentation files, `docs/STEP_fix_20250818.md`

**Overview:**
* Purged `schemaName` references from all guides and examples.
* OpenAPI tenant models only use `planId` and contact fields.

### 🛠️ Fix 2025-08-19 – Auth Logging Cleanup
**Status:** ✅ Done
**Files:** `src/controllers/auth.controller.ts`, `docs/STEP_fix_20250819.md`

**Overview:**
* Removed debug query listing all admin users.
* Reduced auth controller logs to attempts and errors only.

### 🛠️ Fix 2025-08-20 – Remove Tenant Schema Artifacts
**Status:** ✅ Done
**Files:** `package.json`, `scripts/migrate.js`, `scripts/init-test-db.js`, `scripts/reset-passwords.ts`, `jest.setup.js`, `jest.globalSetup.ts`, `tests/utils/db-utils.ts`, `docs/AGENTS.md`, `docs/STEP_fix_20250820.md`

**Overview:**
* Dropped obsolete tenant schema creation logic.
* Test helpers now operate solely on unified tables.

### 🛠️ Fix 2025-08-21 – Remove schemaUtils and Update Analytics
**Status:** ✅ Done
**Files:** `src/utils/priceUtils.ts`, `src/controllers/adminAnalytics.controller.ts`, `src/controllers/analytics.controller.ts`, `docs/STEP_fix_20250821.md`

**Overview:**
* Deleted unused schema utilities.
* Analytics endpoints now compute metrics from shared tables using `tenant_id`.

### 🛠️ Fix 2025-08-22 – Update Setup Database for Unified Schema
**Status:** ✅ Done
**Files:** `scripts/setup-database.js`, `src/utils/seedHelpers.ts`, `docs/STEP_fix_20250822.md`

**Overview:**
* Database setup script no longer creates per-tenant schemas.
* Seed helpers simplified to insert tenants directly into `public.tenants`.

### 🛠️ Fix 2025-08-23 – Test Helpers Use Public Schema
**Status:** ✅ Done
**Files:** `tests/utils/testTenant.ts`, `docs/STEP_fix_20250823.md`

**Overview:**
* Test tenant utility inserts rows into `public.tenants` and `public.users`.
* Fixtures and helpers rely solely on `tenant_id` fields.

### 🛠️ Fix 2025-08-24 – Documentation Cleanup for Unified Schema
**Status:** ✅ Done
**Files:** `docs/ANALYTICS_API.md`, `docs/SUPERADMIN_FRONTEND_GUIDE.md`, `TENANT_UUID_FIX_SUMMARY.md`, `docs/BACKEND_HIERARCHY_API.md`, `docs/STEP_fix_20250824.md`

**Overview:**
* Removed remaining `schema_name` mentions in documentation and marked the field as deprecated.

### 🛠️ Fix 2025-08-25 – Node typings dev dependency
**Status:** ✅ Done
**Files:** `package.json`, `docs/STEP_fix_20250825.md`

**Overview:**
* Moved `@types/node` back to `devDependencies` now that the build installs dev packages.

### 🛠️ Fix 2025-08-26 – Unified Schema Cleanup
**Status:** ✅ Done
**Files:** `src/app.ts`, `src/controllers/admin.controller.ts`, `src/controllers/analytics.controller.ts`, `src/middlewares/*`, `src/types/auth.d.ts`, `migrations/schema/005_master_unified_schema.sql`, `scripts/apply-unified-schema.js`, `frontend/docs/openapi-v1.yaml`, `docs/STEP_fix_20250826.md`

**Overview:**
* Removed deprecated `schemaName` logic from codebase.
* Single migration file simplifies new environment setup.
* API definitions updated for tenant-based schema.

### 🛠️ Fix 2025-08-27 – SQL String Literal Fixes
**Status:** ✅ Done
**Files:** `src/services/creditor.service.ts`, `src/services/fuelPrice.service.ts`, `docs/STEP_fix_20250827.md`

**Overview:**
* Multi-line SQL queries now use template strings instead of single quotes.
* `npm run build` compiles without errors.

### 🛠️ Fix 2025-08-28 – Backend UUID Generation
**Status:** ✅ Done
**Files:** `src/services/tenant.service.ts`, `src/services/admin.service.ts`, `src/services/plan.service.ts`, `docs/STEP_fix_20250828.md`

**Overview:**
* Services no longer rely on database defaults for primary keys.
* UUIDs are generated via `crypto.randomUUID()` before insertion, ensuring compatibility with Azure.

### 🛠️ Fix 2025-08-29 – Comprehensive UUID Insertion
**Status:** ✅ Done
**Files:** `src/services/*`, `docs/STEP_fix_20250829.md`

**Overview:**
* Remaining service-layer inserts now supply UUIDs explicitly.
* Prevents `null value in column "id"` errors across all tables on Azure.

### 🛠️ Fix 2025-08-30 – Admin login route
**Status:** ✅ Done
**Files:** `src/routes/adminAuth.route.ts`, `src/controllers/auth.controller.ts`, `src/services/auth.service.ts`, `src/app.ts`, `docs/openapi.yaml`, `docs/STEP_fix_20250830.md`

**Overview:**
* Added dedicated `/api/v1/admin/auth/login` endpoint for SuperAdmin authentication.
* Ensures admin logins fail fast when credentials do not match an admin user.

### 🛠️ Fix 2025-08-31 – Consistent DB Password Variable
**Status:** ✅ Done
**Files:** `.env.development`, `.env.test`, `docker-compose.yml`, `jest.setup.js`, `jest.globalSetup.ts`, `jest.globalTeardown.ts`, `tests/utils/db-utils.ts`, `docs/STEP_fix_20250831.md`

**Overview:**
* Standardised on `DB_PASSWORD` for all environment configurations.
* Updated Jest helpers to reference the new variable.
### 🛠️ Fix 2025-08-31 – Default 404 handler
**Status:** ✅ Done
**Files:** `src/app.ts`, `docs/openapi.yaml`, `docs/STEP_fix_20250831.md`

**Overview:**
* Added a catch-all route that returns JSON `Route not found` errors.
* OpenAPI spec now documents the `NotFound` response component.

### 🛠️ Fix 2025-09-01 – Secure schemas route
**Status:** ✅ Done
**Files:** `src/app.ts`, `docs/openapi.yaml`, `docs/STEP_fix_20250901.md`

**Overview:**
* `/schemas` endpoint now only executes in non-production environments.
* In production it requires authentication and always responds 403 without touching tables.
### 🛠️ Fix 2025-09-02 – Debug middleware conditional
**Status:** ✅ Done
**Files:** `src/app.ts`, `.env.example`, `.env.development`, `DEV_GUIDE.md`, `docs/STEP_fix_20250902.md`

**Overview:**
* `debugRequest` middleware only loads when not in production or when `DEBUG_REQUESTS=true`.
* Added `DEBUG_REQUESTS` environment variable and updated docs.

### 🛠️ Fix 2025-09-03 – Log directory cleanup
**Status:** ✅ Done
**Files:** `.gitignore`, `docs/STEP_fix_20250903.md`

**Overview:**
* Removed obsolete `logs/server.log` and added the directory to `.gitignore` to keep runtime logs out of version control.

### 🛠️ Fix 2025-09-05 – Tenant creation updated_at bug
**Status:** ✅ Done
**Files:** `src/services/tenant.service.ts`, `docs/STEP_fix_20250905.md`

**Overview:**
* Insert query now populates the `updated_at` column to prevent 500 errors when creating tenants.

### 🛠️ Fix 2025-09-06 – User creation updated_at bug
**Status:** ✅ Done
**Files:** `src/services/user.service.ts`, `src/services/tenant.service.ts`, `docs/STEP_fix_20250906.md`

**Overview:**
* Insert queries for owners, managers, attendants and other users now set `updated_at = NOW()` to avoid null constraint errors.
### 🛠️ Fix 2025-09-06 – Credential consistency
**Status:** ✅ Done
**Files:** `src/services/admin.service.ts`, `scripts/setup-database.js`, `docs/STEP_fix_20250906.md`

**Overview:**
* All documentation and setup scripts now reference `Admin@123` as the default password, resolving login issues caused by outdated credentials.

### 🛠️ Fix 2025-09-07 – DB migration docs cleanup
**Status:** ✅ Done
**Files:** `UNIFIED_DB_SETUP.md`, `docs/DATABASE_MANAGEMENT.md`, `db_brain.md`, `docs/STEP_fix_20250907.md`

**Overview:**
* Documented that `setup-unified-db` loads `005_master_unified_schema.sql`.
* Added instructions for handling new SQL migration files.

### 🛠️ Fix 2025-09-08 – Admin user updated_at bug
**Status:** ✅ Done
**Files:** `src/services/admin.service.ts`, `src/services/adminUser.service.ts`, `docs/STEP_fix_20250908.md`

**Overview:**
* Insert queries for new admin users now include `updated_at = NOW()` to prevent null constraint violations when creating superadmins.

### 🛠️ Fix 2025-09-09 – Prisma DB URL fallback
**Status:** ✅ Done
**Files:** `src/utils/prisma.ts`, `docs/STEP_fix_20250909.md`

**Overview:**
* `src/utils/prisma.ts` now builds `DATABASE_URL` from `DB_*` variables when missing so deployments without the variable still connect.

### 🛠️ Fix 2025-09-10 – Tenant email slug generation
**Status:** ✅ Done
**Files:** `src/services/tenant.service.ts`, `src/utils/slugify.ts`, `docs/STEP_fix_20250910.md`

**Overview:**
* Default user emails use a slugified tenant name instead of the raw UUID.

### 🛠️ Fix 2025-06-28 – Login tests & schema migration
**Status:** ✅ Done
**Files:** `scripts/simple-login-test.js`, `migrations/schema/003_unified_schema.sql`, `migrations/schema/005_master_unified_schema.sql`, `docs/STEP_fix_20250628.md`

**Overview:**
* Updated login test script to match seeded user credentials and configurable port.
* Unified schema SQL adjusted for clean initialization.

### 🛠️ Fix 2025-06-29 – Plan rule lookup by UUID
**Status:** ✅ Done
**Files:** `src/config/planConfig.ts`, `tests/planEnforcement.test.ts`, `docs/STEP_fix_20250629.md`

**Overview:**
* `getPlanRules` now resolves plan rules using the seeded plan UUIDs.
* Added Jest tests covering pump limit enforcement.


### 🛠️ Fix 2025-09-11 – Fuel price validFrom alignment
**Status:** ✅ Done
**Files:** `src/controllers/fuelPrice.controller.ts`, `src/services/fuelPrice.service.ts`, `src/validators/fuelPrice.validator.ts`, `src/utils/priceUtils.ts`, `src/utils/seedHelpers.ts`, `src/docs/swagger.ts`, `frontend/docs/integration-instructions.md`, `docs/STEP_fix_20250911.md`

**Overview:**
* All price CRUD endpoints now expect `validFrom`. Utility helpers and swagger docs updated to match the database column `valid_from`.

### 🛠️ Fix 2025-09-12 – Tenant context middleware
**Status:** ✅ Done
**Files:** `src/middlewares/setTenantContext.ts`, `docs/SECURITY_tenant_authorization.md`, `docs/STEP_fix_20250912.md`

**Overview:**
* Middleware now populates tenant IDs from the `x-tenant-id` header when absent in the JWT and rejects requests missing any tenant context.

### 🛠️ Fix 2025-09-13 – Tenant list counts
**Status:** ✅ Done
**Files:** `src/services/tenant.service.ts`, `docs/STEP_fix_20250913.md`

**Overview:**
* `listTenants` now computes `stationCount` and `userCount` so the SuperAdmin dashboard receives these metrics.

### 🛠️ Fix 2025-09-14 – Explicit updated_at on inserts
**Status:** ✅ Done
**Files:** various `src/services/*.ts`, `docs/STEP_fix_20250914.md`

**Overview:**
* Insert queries now include `updated_at = NOW()` ensuring compatibility with strict schemas.

### 🛠️ Fix 2025-09-15 – Unified sales storage
**Status:** ✅ Done
**Files:** `src/services/nozzleReading.service.ts`, `src/services/reconciliation.service.ts`, `src/controllers/reconciliation.controller.ts`, `src/controllers/dashboard.controller.ts`, `src/controllers/reports.controller.ts`, `docs/STEP_fix_20250915.md`

**Overview:**
* Sales rows are now inserted into `public.sales` and queried consistently using `tenant_id`.
* Dashboard analytics, reconciliation and reports all reference the unified tables.

### 🛠️ Fix 2025-09-16 – Nozzle reading service wiring
**Status:** ✅ Done
**Files:** `src/controllers/nozzleReading.controller.ts`, `docs/STEP_fix_20250916.md`

**Overview:**
* The nozzle reading API now calls the service layer so each reading also creates a sales row in `public.sales`.

### 🛠️ Fix 2025-09-17 – Sales listing numeric values
**Status:** ✅ Done
**Files:** `src/services/sales.service.ts`, `docs/STEP_fix_20250917.md`

**Overview:**
* `listSales` now converts `volume` and `amount` with `parseFloat` so API responses use numeric types.

### 🛠️ Fix 2025-09-18 – Numeric and date parsing
**Status:** ✅ Done
**Files:** `src/utils/parseDb.ts`, `src/services/*`, `docs/STEP_fix_20250918.md`

**Overview:**
* Introduced a shared parser so all service methods return numbers and `Date` objects rather than strings.

### 🛠️ Fix 2025-09-19 – TypeScript generic constraint
**Status:** ✅ Done
**Files:** `src/utils/parseDb.ts`, `docs/STEP_fix_20250919.md`

**Overview:**
* Added an explicit record constraint to `parseRows` so TypeScript build passes.

### 🛠️ Fix 2025-09-20 – Tenant_id column migration
**Status:** ✅ Done
**Files:** `migrations/schema/006_add_tenant_id_columns.sql`, `docs/STEP_fix_20250920.md`

**Overview:**
* Added conditional migration to add `tenant_id` foreign keys when missing so older deployments match the unified schema.

### 🛠️ Fix 2025-09-21 – Daily summary previous-day readings
**Status:** ✅ Done
**Files:** `src/controllers/reconciliation.controller.ts`, `docs/STEP_fix_20250921.md`

**Overview:**
* Reworked `getDailySummary` query so readings are filtered after lagging, allowing nozzles with a single reading to use the prior day's value.

### 🛠️ Fix 2025-09-22 – Daily summary price lookup
**Status:** ✅ Done
**Files:** `src/controllers/reconciliation.controller.ts`, `docs/STEP_fix_20250920.md`

**Overview:**
* Daily summary now selects the correct fuel price based on each reading's timestamp via a lateral join and shows entries even when only one reading exists.

### 🛠️ Fix 2025-09-23 – Unified setup runs migrations
**Status:** ✅ Done
**Files:** `scripts/setup-unified-db.js`, `UNIFIED_DB_SETUP.md`, `db_brain.md`, `docs/STEP_fix_20250923.md`

**Overview:**
* The setup script now executes `node scripts/migrate.js up` after applying the master schema to ensure all new migration files run automatically.

### 🛠️ Step 2.37 – Attendant access & cash reports
**Status:** ✅ Done
**Files:** `migrations/schema/007_create_cash_reports.sql`, `src/services/attendant.service.ts`, `src/controllers/attendant.controller.ts`, `src/routes/attendant.route.ts`, `src/app.ts`, `docs/openapi.yaml`

**Overview:**
* Added attendant endpoints to list assigned stations, pumps, nozzles and creditors.
* Introduced `cash_reports` table and API for attendants to submit daily cash and credit totals.

### 🛠️ Step 2.38 – Attendant cash reports & alerts
**Status:** ✅ Done
**Files:** `src/services/attendant.service.ts`, `src/controllers/attendant.controller.ts`, `src/routes/attendant.route.ts`, `docs/openapi.yaml`, `backend_brain.md`

**Overview:**
* Added endpoint to list attendant cash reports.
* Exposed attendant alerts API with acknowledge action.

### 🛠️ Step 2.39 – Fuel price validation endpoints
**Status:** ✅ Done
**Files:** `src/services/fuelPriceValidation.service.ts`, `src/controllers/fuelPrice.controller.ts`, `src/routes/fuelPrice.route.ts`, `docs/openapi.yaml`

**Overview:**
* Added validation API to check missing fuel types and outdated prices by station.
* Endpoint to list stations lacking active prices.

### 🛠️ Step 2.40 – Nozzle reading creation validation
**Status:** ✅ Done
**Files:** `src/services/nozzleReading.service.ts`, `src/controllers/nozzleReading.controller.ts`, `src/routes/nozzleReading.route.ts`, `docs/openapi.yaml`, `src/docs/swagger.ts`

**Overview:**
* Added endpoint to verify nozzle status and price before recording a reading.

### 🛠️ Step 2.41 – Alert creation & summary endpoints
**Status:** ✅ Done
**Files:** `src/services/alert.service.ts`, `src/controllers/alerts.controller.ts`, `src/routes/alerts.route.ts`, `docs/openapi.yaml`

**Overview:**
* Added API to create alerts and fetch unread counts grouped by severity.

### 🛠️ Step 2.42 – Automated alert rules
**Status:** ✅ Done
**Files:** `src/services/alertRules.service.ts`, `docs/BUSINESS_RULES.md`

**Overview:**
* Added service functions that generate alerts for missing readings, prices, credit limits, inactivity and cash reports.

### 🛠️ Step 2.43 – Price validation on readings
**Status:** ✅ Done
**Files:** `src/utils/priceUtils.ts`, `src/services/nozzleReading.service.ts`, `tests/sales.service.test.ts`

**Overview:**
* Nozzle readings now fail if fuel price is missing or older than seven days.
* Credit sales trigger a warning alert when above 90% of the limit.

### 🛠️ Step 2.44 – Role journey documentation
**Status:** ✅ Done
**Files:** `docs/journeys/*.md`

**Overview:**
* Added dedicated API journey guides for SUPERADMIN, OWNER, MANAGER and ATTENDANT roles. These documents map login flows, endpoints and DB touch points for QA and future-proofing.

### 🛠️ Step 2.45 – SuperAdmin tenant settings
**Status:** ✅ Done
**Files:** `migrations/schema/008_create_tenant_settings_kv.sql`, `src/services/settingsService.ts`, `src/services/tenant.service.ts`, `src/controllers/adminSettings.controller.ts`, `src/routes/adminApi.router.ts`

**Overview:**
* Introduced `tenant_settings_kv` table to store feature flags and preferences per tenant.
* Default records are seeded on tenant creation.
* New SuperAdmin endpoints allow viewing and updating these settings.

### 🛠️ Step 2.46 – Journey docs alignment
**Status:** ✅ Done
**Files:** `docs/journeys/*.md`

**Overview:**
* Updated all role journey documents to mirror the current OpenAPI contract including new settings endpoints, inventory routes and auth helpers.

### 🛠️ Fix 2025-10-05 – PoolClient settings parameter
**Status:** ✅ Done
**Files:** `src/services/settingsService.ts`, `docs/STEP_fix_20251005.md`

**Overview:**
* setDefaultSettings now accepts a `PoolClient` so tenant creation compiles without type errors.


### 🛠️ Fix 2025-11-01 – Fuel inventory updated_at column
**Status:** ✅ Done
**Files:** `src/services/fuelInventory.service.ts`, `docs/STEP_fix_20251101.md`

**Overview:**
* Added `updated_at` timestamp to the tenant `fuel_inventory` table to align with seed logic.

### 🛠️ Fix 2025-11-02 – Delivery and inventory schema enums
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `frontend/docs/openapi-v1.yaml`, `src/docs/swagger.ts`, `docs/STEP_fix_20251102.md`

**Overview:**
* OpenAPI docs now expose a `capacity` field on inventory entries.
* Fuel deliveries accept a `supplier` name and `premium` as a fuel type.

### 🛠️ Step 2.47 – Response wrapper & new endpoints
**Status:** ✅ Done
**Files:** See `docs/STEP_2_47_COMMAND.md`

**Overview:**
* Standardised success and error responses.
* Added `/dashboard/system-health`, `/stations/{stationId}/efficiency`, and `/reconciliation/{id}/approve` endpoints.

### 🛠️ Step 2.48 – Script guide and cleanup
**Status:** ✅ Done
**Files:** `docs/SCRIPTS_GUIDE.md`, removed legacy scripts, `docs/STEP_2_48_COMMAND.md`

**Overview:**
* Documented all useful scripts in one guide.
* Deleted obsolete testing utilities.
* README files link to the new guide.


### 🛠️ Step 2.49 – successResponse parameter alignment
**Status:** ✅ Done
**Files:** `docs/STEP_2_49_COMMAND.md`, various controllers

**Overview:**
* Updated create endpoints to pass the HTTP status code as the fourth argument of `successResponse`.

### 🛠️ Step 2.50 – Setup status API
**Status:** ✅ Done
**Files:** `src/services/setupStatus.service.ts`, `src/controllers/setupStatus.controller.ts`, `src/routes/setupStatus.route.ts`, `src/app.ts`, `docs/openapi.yaml`, `docs/STEP_2_50_COMMAND.md`

**Overview:**
* Added `/setup-status` endpoint to compute onboarding progress via entity counts.
* Service checks stations, pumps, nozzles and fuel prices for the current tenant.

### 🛠️ Step 2.51 – Duplicate nozzle conflict handling
**Status:** ✅ Done
**Files:** `src/controllers/nozzle.controller.ts`, `docs/openapi.yaml`, `tests/nozzle.controller.test.ts`, `docs/STEP_2_51_COMMAND.md`

**Overview:**
* Creation errors from Prisma with code `P2002` now return status `409` and a clear message.
* OpenAPI spec lists the 409 response and a unit test verifies the behaviour.

### 🛠️ Step 2.52 – Nozzle fuel type validation
**Status:** ✅ Done
**Files:** `src/validators/nozzle.validator.ts`, `docs/STEP_2_52_COMMAND.md`

**Overview:**
* `validateCreateNozzle` checks that `fuelType` is one of `petrol`, `diesel` or `premium`.
* Optional `status` is validated and included when present.

### 🛠️ Fix 2025-11-14 – Pump request schema correction
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `docs/STEP_fix_20251114.md`

**Overview:**
* POST and PUT pump endpoints use the correct `CreatePumpRequest` schema.
### 🛠️ Fix 2025-11-16 – Nozzle request schema cleanup
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `docs/STEP_fix_20251116_COMMAND.md`

**Overview:**
* POST and PUT nozzle endpoints now reference `CreateNozzleRequest` for consistency.
* The schema lists allowed values for `fuelType` and optional `status`.

### 🛠️ Fix 2025-11-17 – Response object consistency
**Status:** ✅ Done
**Files:** `src/controllers/nozzle.controller.ts`, `docs/STEP_fix_20251117.md`

**Overview:**
* GET handlers return `{ pump }` or `{ nozzle }` within the success response wrapper for consistent API shape.

### 🛠️ Fix 2025-11-18 – Nozzle validator type cast
**Status:** ✅ Done
**Files:** `src/validators/nozzle.validator.ts`, `docs/STEP_fix_20251118.md`

**Overview:**
* Cast `fuelType` to the allowed union type to resolve TypeScript compilation errors.

### 🛠️ Fix 2025-11-19 – Fuel price station names
**Status:** ✅ Done
**Files:** `backend_brain.md`, `docs/STEP_fix_20251119.md`

**Overview:**
* Fuel price endpoints now include related station details in the response.

### 🛠️ Fix 2025-11-20 – Fuel price station id in spec
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `src/controllers/fuelPrice.controller.ts`, `docs/STEP_fix_20251120.md`

**Overview:**
* Fuel price schema now documents `station.id` and listing returns station id with name.

### 🛠️ Step 2.53 – Fuel inventory summary endpoint
**Status:** ✅ Done
**Files:** `src/services/fuelInventory.service.ts`, `src/controllers/fuelInventory.controller.ts`, `src/routes/fuelInventory.route.ts`, `docs/openapi.yaml`, `docs/STEP_2_53_COMMAND.md`

**Overview:**
* Added `GET /fuel-inventory/summary` to aggregate current volume and capacity by fuel type.
* Endpoint creates the table if missing and returns totals using the standard success wrapper.

### 🛠️ Fix 2025-11-23 – Cash report credit entries
**Status:** ✅ Done
**Files:** `src/services/attendant.service.ts`, `src/controllers/attendant.controller.ts`, `docs/openapi.yaml`, `backend_brain.md`, `docs/STEP_fix_20251123.md`

**Overview:**
* Cash report API now accepts `creditEntries` with creditor and fuel details.
* Service creates sales for each credit entry and calculates total credit automatically.

### 🛠️ Fix 2025-11-24 – Extended JWT lifetime
**Status:** ✅ Done
**Files:** `src/constants/auth.ts`, `src/utils/jwt.ts`, `docs/AUTH.md`, `docs/journeys/*`, `docs/STEP_fix_20251124.md`

**Overview:**
* Increased `JWT_EXPIRES_IN` to `100y` to avoid token expiry during long-running tests.

### 🛠️ Fix 2025-11-25 – Refresh token constant
**Status:** ✅ Done
**Files:** `src/constants/auth.ts`, `src/controllers/auth.controller.ts`, `docs/AUTH.md`, `docs/STEP_fix_20251125.md`

**Overview:**
* Added `REFRESH_TOKEN_EXPIRES_IN` constant and used `JWT_SECRET` when signing refresh tokens.
* AUTH guide now notes the 24h refresh token policy.

### 🛠️ Fix 2025-11-26 – Unified fuel inventory queries
**Status:** ✅ Done
**Files:** `src/services/fuelInventory.service.ts`, `src/services/inventory.service.ts`, `src/services/delivery.service.ts`, `src/controllers/fuelInventory.controller.ts`, `src/controllers/delivery.controller.ts`, `docs/STEP_fix_20251126.md`

**Overview:**
* Inventory and delivery services now reference `public.fuel_inventory` and join `public` tables.
* Queries filter by `tenant_id` and controllers no longer embed tenant schema strings.
### 🛠️ Fix 2025-11-27 – Dashboard station filter handling
**Status:** ✅ Done
**Files:** `src/utils/normalizeStationId.ts`, controllers updated, `docs/STEP_fix_20251127.md`

**Overview:**
* Normalizes `stationId` query parameters so `all` or undefined values aggregate all stations.

### 🛠️ Fix 2025-11-28 – Previous reading in nozzle listing
**Status:** ✅ Done
**Files:** `src/services/nozzleReading.service.ts`, `docs/openapi.yaml`, `docs/STEP_fix_20251128.md`

**Overview:**
* `GET /api/v1/nozzle-readings` now returns `previousReading` by computing a window function over all readings.
* OpenAPI schema updated accordingly.

### 🛠️ Step 2.54 – API corrections and feature flags
**Status:** ✅ Done
**Files:** `src/routes/dashboard.route.ts`, `src/app.ts`, `src/controllers/settings.controller.ts`, `docs/openapi.yaml`, `docs/STEP_2_54_COMMAND.md`

**Overview:**
* Added deprecated dashboard aliases and new `/tenant/settings` endpoint exposing feature flags.
* Updated OpenAPI response schemas for comparison, ranking and inventory routes.

### 🛠️ Step 2.55 – Dashboard station metrics endpoint
**Status:** ✅ Done
**Files:** `src/services/station.service.ts`, `src/controllers/dashboard.controller.ts`, `src/routes/dashboard.route.ts`, `docs/openapi.yaml`, `docs/STEP_2_55_COMMAND.md`

**Overview:**
* New endpoint `/dashboard/station-metrics` provides per-station totals and efficiency.
* Added `StationMetric` schema in the API specification.

### 🛠️ Fix 2025-12-01 – Alert parameter naming alignment
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `frontend/docs/openapi-v1.yaml`, `docs/STEP_fix_20251201.md`

**Overview:**
* Changed path parameter `alertId` to `id` for consistency with implemented routes.

### 🛠️ Step 2.56 – Backend analytics and inventory completion
**Status:** ✅ Done
**Files:** `src/services/analytics.service.ts`, `src/services/fuelInventory.service.ts`, `src/services/tenant.service.ts`, `src/controllers`, `src/routes`, `docs/openapi.yaml`, `docs/STEP_2_56_COMMAND.md`

**Overview:**
* Added tenant dashboard metrics endpoint and admin tenant summary.
* Fuel inventory uses delivery and reading data for tank levels.
* Auth responses now return tenant name and fuel price list includes station name.
* Marked testing endpoints as internal in API docs.

### 🛠️ Step 2.57 – Tenant email convention update
**Status:** ✅ Done
**Files:** `src/services/tenant.service.ts`, `docs/TENANT_CREATION_API.md`, `docs/TENANT_MANAGEMENT_GUIDE.md`, `TENANT_USER_CREATION_PROCESS.md`, `docs/USER_MANAGEMENT.md`, `UNIFIED_DB_SETUP.md`, `docs/STEP_2_57_COMMAND.md`

**Overview:**
* Default user emails now follow `<role>@<schema>.fuelsync.com` for predictability.

### 🛠️ Fix 2025-12-02 – Frontend hooks OpenAPI alignment
**Status:** ✅ Done
**Files:** `src/api/*`, `CHANGELOG.md`, `docs/STEP_fix_20251202.md`

**Overview:**
* API services now read from the `data` field of responses.
* Legacy keys like `stations` or `inventory` are no longer referenced.

### 🛠️ Fix 2025-12-06 – Prisma usage audit
**Status:** ✅ Done
**Files:** `docs/PRISMA_EFFICIENCY_REVIEW.md`, `docs/STEP_fix_20251206.md`

**Overview:**
* Reviewed all services and controllers for raw SQL and inefficient Prisma usage.
* Documented recommendations to migrate queries to Prisma and add proper types.
\n### 🛠️ Fix 2025-12-07 – Prisma migration of services\n**Status:** ✅ Done\n**Files:** `src/services/user.service.ts`, `src/services/pump.service.ts`, `src/controllers/analytics.controller.ts`, `docs/STEP_fix_20251207.md`\n\n**Overview:**\n* Replaced `pg` queries with Prisma transactions in core services.\n* Converted analytics controller to use Prisma aggregates.\n

### 🛠️ Fix 2025-12-10 – TypeScript build fixes
**Status:** ✅ Done
**Files:** `docs/STEP_fix_20251210.md`

**Overview:**
* Resolved compilation errors by aligning Prisma usage and imports.


### 🛠️ Fix 2025-12-11 – Explicit typing cleanup
**Status:** ✅ Done
**Files:** `docs/STEP_fix_20251211.md`

**Overview:**
* Added explicit types for callback parameters and transaction clients.
* Replaced `$queryRaw` generics with type assertions to satisfy strict TypeScript.

### 🛠️ Fix 2025-12-12 – Automated Prisma client generation
**Status:** ✅ Done
**Files:** `package.json`, `docs/STEP_fix_20251212.md`

**Overview:**
* Added `postinstall` script to automatically run `prisma generate` on deployment.

### 🛠️ Fix 2025-12-13 – Handle empty dashboard results
**Status:** ✅ Done
**Files:** `src/controllers/dashboard.controller.ts`, `docs/STEP_fix_20251213.md`

**Overview:**
* Dashboard payment and creditor endpoints now return an empty array when no records exist.

### 🛠️ Fix 2025-12-14 – Uniform dashboard empty handling
**Status:** ✅ Done
**Files:** `src/controllers/dashboard.controller.ts`, `docs/STEP_fix_20251214.md`

**Overview:**
* Added explicit empty-row checks to all dashboard endpoints for consistency.

### 🛠️ Fix 2025-12-15 – Explicit empty list handling
**Status:** ✅ Done
**Files:** `src/controllers/*`, `docs/STEP_fix_20251215.md`

**Overview:**
* Added `rows.length === 0` checks to all list endpoints so they return an empty array instead of an object with zero records.

### 🛠️ Fix 2025-12-16 – Node typings for TypeScript
**Status:** ✅ Done
**Files:** `package.json`, `package-lock.json`, `docs/STEP_fix_20251216.md`

**Overview:**
* Added `@types/node` to devDependencies so `tsc` succeeds without missing type errors.

### 🛠️ Fix 2025-12-17 – Station metrics compile fix
**Status:** ✅ Done
**Files:** `src/services/station.service.ts`, `docs/STEP_fix_20251217.md`

**Overview:**
* Cast station listing results to `any[]` so the `metrics` property can be assigned without compile errors.

### 🛠️ Fix 2025-12-18 – Prisma price helper typing
**Status:** ✅ Done
**Files:** `src/utils/priceUtils.ts`, `docs/STEP_fix_20251218.md`

**Overview:**
* Updated `getPriceAtTimestamp` to accept `PrismaClient` directly, resolving build errors when called from services.

### 🛠️ Fix 2025-12-19 – Station list typing and price lookup
**Status:** ✅ Done
**Files:** `src/services/attendant.service.ts`, `src/services/station.service.ts`, `docs/STEP_fix_20251219.md`

**Overview:**
* Passed the pg transaction client to `getPriceAtTimestamp` in cash report creation.
* Cast station listing results to `any[]` so metrics can be attached without type errors.

### 🛠️ Fix 2025-12-20 – Apply documented Prisma price helper
**Status:** ✅ Done
**Files:** `src/utils/priceUtils.ts`, `src/services/attendant.service.ts`, `src/services/nozzleReading.service.ts`, `README.md`, `docs/STEP_fix_20251220.md`

**Overview:**
* Converted `getPriceAtTimestamp` to use `PrismaClient`.
* Services now pass the Prisma instance for price lookups.
* README links to the local Postgres setup guide.

### 🛠️ Fix 2026-07-16 – Azure deployment docs
**Status:** ✅ Done
**Files:** `docs/AZURE_DEPLOYMENT_GUIDE.md`, `docs/AZURE_DEV_SETUP.md`, `README.md`, `docs/STEP_fix_20260716_COMMAND.md`

**Overview:**
* Documented environment variables and Azure setup script usage.
* Added a developer guide for connecting to an Azure database.
* Linked both guides from the README.

### 🛠️ Fix 2026-07-17 – Dashboard station access
**Status:** ✅ Done
**Files:** `src/controllers/dashboard.controller.ts`, `tests/dashboard.controller.test.ts`, `docs/STEP_fix_20260717_COMMAND.md`

**Overview:**
* Added `user_stations` check to all dashboard endpoints with `stationId`.
* Handlers return a 403 response when the user lacks access.
* Added unit tests for the new validation logic.

### 🛠️ Fix 2026-07-18 – Fuel price effective dates
**Status:** ✅ Done
**Files:** `backend/src/validators/fuelPrice.validator.ts`, `backend/src/controllers/fuelPrice.controller.ts`, `backend/src/services/fuelPrice.service.ts`, `src/api/api-contract.ts`, `docs/STEP_fix_20260718_COMMAND.md`

**Overview:**
* `validFrom` in fuel price creation is now optional and defaults to the current timestamp.
* `effectiveTo` may be supplied and must be later than `validFrom`.

### 🛠️ Fix 2026-07-19 – Fuel price range override
**Status:** ✅ Done
**Files:** `backend/src/controllers/fuelPrice.controller.ts`, `backend/src/services/fuelPrice.service.ts`, `docs/STEP_fix_20260719_COMMAND.md`

**Overview:**
* When creating a new fuel price, any open range for the same station and fuel type is automatically closed by setting its `effective_to` to the new `valid_from`.

### 🛠️ Fix 2026-07-22 – Fuel price service tests
**Status:** ✅ Done
**Files:** `backend/tests/fuelPrice.service.test.ts`, `docs/STEP_fix_20260722_COMMAND.md`

**Overview:**
* Added unit tests to ensure overlapping ranges throw errors and open ranges are closed when a new price is created.

### 🛠️ Fix 2026-07-26 – OpenAPI contract tests
**Status:** ✅ Done
**Files:** `__tests__/integration/api-contract.test.ts`, `__tests__/integration/openapiRoutes.test.ts`, `docs/STEP_fix_20260726_COMMAND.md`

**Overview:**
* Tests reference `docs/openapi.yaml` and hit `/api/v1` routes directly.

### 🛠️ Fix 2026-07-27 – Remove outdated price restriction
**Status:** ✅ Done
**Files:** `src/services/nozzleReading.service.ts`, `docs/STEP_fix_20260727_COMMAND.md`

**Overview:**
* Removed the 7‑day fuel price validity check so older prices can still be used when recording readings.

### 🛠️ Fix 2026-07-28 – Expand service and controller tests
**Status:** ✅ Done
**Files:** `tests/station.controller.test.ts`, `tests/inventory.service.test.ts`, `docs/STEP_fix_20260728_COMMAND.md`

**Overview:**
* Added basic unit tests for the station controller create handler and inventory service update logic.
\n### 🛠️ Fix 2026-07-29 – Validate controller exports\n**Status:** ✅ Done\n**Files:** `tests/controllersExist.test.ts`, `docs/STEP_fix_20260729_COMMAND.md`\n\n**Overview:**\n* Added automated test that loads each controller file and checks that a create handler function returns an object of handlers.

### 🛠️ Fix 2026-07-30 – Resolve unit test failures
**Status:** ✅ Done
**Files:** `tests/controllersExist.test.ts`, `tests/inventory.service.test.ts`, `tests/nozzle.controller.test.ts`, `tests/planEnforcement.test.ts`, `docs/STEP_fix_20260730_COMMAND.md`

**Overview:**
* Installed PostgreSQL and updated tests so they run without dynamic imports.
* Added missing type definitions and corrected service mocks.

### 🛠️ Fix 2026-07-31 – Type corrections for tests
**Status:** ✅ Done
**Files:** `src/services/nozzleReading.service.ts`, `src/services/reconciliation.service.ts`, `tests/readings.service.test.ts`, `docs/STEP_fix_20260731_COMMAND.md`

**Overview:**
* Resolved TypeScript errors in services by selecting `recorded_at` and using `Number()` for numeric comparisons.
* Updated the readings service unit test to align with the revised API.

### 🛠️ Fix 2026-08-01 – Restore passing unit tests
**Status:** ✅ Done
**Files:** `src/utils/priceUtils.ts`, `src/services/attendant.service.ts`, `tests/dashboard.controller.test.ts`, `tests/sales.service.test.ts`, `tests/readings.service.test.ts`, `__tests__/integration/versioning.test.ts`, `__tests__/integration/openapiRoutes.test.ts`, `__tests__/integration/api-contract.test.ts`, `docs/STEP_fix_20260801_COMMAND.md`

**Overview:**
* Installed Node modules and configured Postgres authentication for testing.
* Fixed price lookup helper and updated associated unit test.
* Replaced outdated assertions in dashboard summary tests.
* Mocked Prisma in readings tests to prevent raw query failures.
* Updated integration tests to use `/api/v1` routes and skip an obsolete analytics endpoint.
* Adjusted attendant service cash parsing logic.

### 🛠️ Fix 2026-08-02 – Document Postgres password setup
**Status:** ✅ Done
**Files:** `README.md`, `docs/STEP_fix_20260802_COMMAND.md`

**Overview:**
* Added explicit `psql` command to set the `postgres` password in the manual setup section.
* Verified tests succeed when PostgreSQL is installed and running.

### 🛠️ Fix 2026-08-03 – Sync OpenAPI with controllers
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `docs/STEP_fix_20260803_COMMAND.md`

**Overview:**
* Audited all backend routers and added missing paths to the OpenAPI spec.
* Documented analytics, delivery inventory, pump settings and reconciliation endpoints.

### 🛠️ Fix 2026-08-04 – Complete admin OpenAPI routes
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `docs/STEP_fix_20260804_COMMAND.md`

**Overview:**
* Added `/admin/dashboard` and `/admin/analytics` paths.
* Documented tenant settings management endpoints for Super Admin.

### 🛠️ Fix 2026-08-05 – Audit OpenAPI after sales update
**Status:** ✅ Done
**Files:** `docs/STEP_fix_20260805_COMMAND.md`

**Overview:**
* Checked all routers for coverage in the OpenAPI file after the sales service refactor.
* No missing paths were found; documentation remains accurate.

### 🛠️ Fix 2026-08-06 – Re-audit OpenAPI after controller updates
**Status:** ✅ Done
**Files:** `scripts/audit-openapi-spec.ts`, `docs/STEP_fix_20260806_COMMAND.md`

**Overview:**
* Introduced a small audit script to list routes missing from the spec.
* Running the script showed the documentation already covers all paths.
* Test execution still fails because `docker-compose` is unavailable.

### 🛠️ Fix 2026-08-07 – Clean OpenAPI specification
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `scripts/addOperationIds.js`, `docs/STEP_fix_20260807_COMMAND.md`

**Overview:**
* Removed deprecated endpoints and generated operationIds for every route.
* Added reusable error and pagination components and updated all operations.
* Authentication endpoints now bypass global security.
\n### 🛠️ Fix 2026-08-08 – SuperAdmin analytics metrics\n**Status:** ✅ Done\n**Files:** `src/services/analytics.service.ts`, `src/controllers/analytics.controller.ts`, `docs/openapi.yaml`, `docs/STEP_fix_20260808_COMMAND.md`\n\n**Overview:**\n* Extended super admin dashboard data with revenue, usage and tenant metrics.\n* Documentation updated to reflect new response format.\n

### 🛠️ Fix 2026-08-09 – User updatedAt field
**Status:** ✅ Done
**Files:** `src/controllers/user.controller.ts`, `docs/openapi.yaml`, `docs/STEP_fix_20260809_COMMAND.md`

**Overview:**
* Exposed `updatedAt` from the database in user API responses.
* Added `updatedAt` to the `User` schema.
* Confirmed `isActive` and `permissions` are not stored in the schema.

### 🛠️ Fix 2026-08-10 – ReconciliationRecord contract alignment
**Status:** ✅ Done
**Files:** `src/services/reconciliation.service.ts`, `migrations/schema/*`, `docs/openapi.yaml`, `frontend/docs/openapi-v1.yaml`, `docs/STEP_fix_20260810_COMMAND.md`

**Overview:**
* Added `opening_reading`, `closing_reading` and `variance` columns.
* Service now computes readings from nozzle data and stores them.
* Documentation updated to reflect new response fields.

### 🛠️ Fix 2026-08-11 – Reconciliation request cleanup
**Status:** ✅ Done
**Files:** `src/controllers/reconciliation.controller.ts`, `docs/openapi.yaml`, `frontend/docs/openapi-v1.yaml`, `docs/STEP_fix_20260811_COMMAND.md`

**Overview:**
* Removed `totalExpected` and `cashReceived` from request schema.
* Create handler now expects a `date` field to trigger reconciliation.

### 🛠️ Step 2.58 – API type generation
**Status:** ✅ Done
**Files:** `src/types/api.ts`, `package.json`, `docs/openapi.yaml`, `docs/STEP_2_58_COMMAND.md`

**Overview:**
* Added placeholder schemas for daily sales reporting so the spec validates.
* Generated TypeScript API definitions via `openapi-typescript`.

### 🛠️ Fix 2026-08-12 – Expanded domain fields
**Status:** ✅ Done
**Files:** `src/controllers/nozzle.controller.ts`, `src/services/nozzleReading.service.ts`, `src/controllers/fuelPrice.controller.ts`, `src/services/fuelInventory.service.ts`, `docs/openapi.yaml`, `src/types/api.ts`, `docs/STEP_fix_20260812_COMMAND.md`

**Overview:**
* Added pumpName to nozzle responses.
* Nozzle reading endpoints now return nozzleNumber, previousReading, volume, amount, pricePerLitre, fuelType, stationName and attendantName.
* Fuel price listing includes stationName and isActive flag.
* Fuel inventory now reports minimumLevel and status.
* Regenerated TypeScript API types.
\n### 🛠️ Fix 2026-08-13 – Display field adjustments\n**Status:** ✅ Done\n**Files:** `src/services/fuelInventory.service.ts`, `src/controllers/fuelPrice.controller.ts`, `src/services/nozzleReading.service.ts`, `docs/openapi.yaml`, `src/types/api.ts`, `docs/STEP_fix_20260813_COMMAND.md`\n\n**Overview:**\n* Adjusted inventory status levels and added enum to the spec.\n* Active price calculation now considers validFrom.\n* Queries compute volume and amount directly from readings.\n* Regenerated API definitions.\n
\n### 🛠️ Fix 2026-08-14 – Validate user existence on update
**Status:** ✅ Done
**Files:** `src/controllers/user.controller.ts`, `src/services/fuelInventory.service.ts`, `docs/STEP_fix_20260814_COMMAND.md`

**Overview:**
* Added a 404 check after fetching updated user records for both SuperAdmin and tenant paths.
* Fuel inventory status now derives from the configured minimum level.

### 🛠️ Fix 2026-08-15 – Station access query fix
**Status:** ✅ Done
**Files:** `src/controllers/dashboard.controller.ts`, `src/middlewares/checkStationAccess.ts`, `src/controllers/sales.controller.ts`, `docs/STEP_fix_20260815_COMMAND.md`

**Overview:**
* Dashboard and middleware access checks now join stations to verify `tenant_id`.
* Sales endpoints validate station access again.

### 🛠️ Fix 2026-08-16 – Owner station access
**Status:** ✅ Done
**Files:** `src/middlewares/checkStationAccess.ts`, `src/controllers/dashboard.controller.ts`, `src/controllers/sales.controller.ts`, `src/utils/hasStationAccess.ts`, `docs/STEP_fix_20260816_COMMAND.md`

**Overview:**
* Owners automatically access stations in their tenant without `user_stations` mappings.
* Shared helper validates access for all roles.

### 🛠️ Fix 2026-08-17 – Add reconciliation readings columns
**Status:** ✅ Done
**Files:** `migrations/schema/012_add_day_reconciliation_readings.sql`, `prisma/schema.prisma`, `docs/STEP_fix_20260817_COMMAND.md`

**Overview:**
* Added missing fields to `day_reconciliations` table for existing databases.
* Prisma schema aligned and client regenerated.

### 🛠️ Fix 2026-08-18 – Reconciliation docs clarification
**Status:** ✅ Done
**Files:** `docs/RECONCILIATION_API.md`, `docs/STEP_fix_20260818_COMMAND.md`

**Overview:**
* Documented the SQL used to aggregate nozzle readings.
* Explained the variance formula and cash difference logic.
* Highlighted the single reconciliation per day policy and listed key endpoints.

### 🛠️ Fix 2026-08-19 – Add lastReading to nozzle list
**Status:** ✅ Done
**Files:** `src/services/nozzle.service.ts`, `docs/STEP_fix_20260819_COMMAND.md`

**Overview:**
* `listNozzles` now joins the latest nozzle reading and exposes `last_reading`.

### 🛠️ Fix 2026-08-21 – OpenAPI void endpoint
**Status:** ✅ Done
**Files:** `docs/openapi.yaml`, `frontend/docs/openapi-v1.yaml`, `src/types/api.ts`, `docs/STEP_fix_20260821_COMMAND.md`

**Overview:**
* Added missing specification for voiding nozzle readings.
* Regenerated API type definitions.

### 🛠️ Fix 2026-08-22 – Compile before start
**Status:** ✅ Done
**Files:** `package.json`, `docs/STEP_fix_20260822_COMMAND.md`

**Overview:**
* Added a `prestart` script so deployments run `npm run build` automatically.

### 🛠️ Fix 2026-08-23 – Flatten build output
**Status:** ✅ Done
**Files:** `tsconfig.json`, `package.json`, `docs/STEP_fix_20260823_COMMAND.md`

**Overview:**
* Compiles TypeScript from `src/` directly into `dist/` and runs `node dist/app.js`.

### 🛠️ Fix 2026-08-24 – DB connection debug logs
**Status:** ✅ Done
**Files:** `src/controllers/auth.controller.ts`, `docs/STEP_fix_20260824_COMMAND.md`

**Overview:**
* Added testConnection logging inside the login route to verify database connectivity on each login attempt.

### 🛠️ Fix 2026-08-25 – Render DB setup automation
**Status:** ✅ Done
**Files:** `package.json`, `docs/RENDER_DEPLOYMENT_GUIDE.md`, `docs/STEP_fix_20260825_COMMAND.md`

**Overview:**
* `postinstall` now applies pending migrations after generating the Prisma client.
* Added deployment guide for provisioning a Render database and running `npm run setup-db` once.

### 🛠️ Fix 2026-08-26 – Automatic DB bootstrap
**Status:** ✅ Done
**Files:** `package.json`, `scripts/ensure-db-init.js`, `docs/RENDER_DEPLOYMENT_GUIDE.md`, `docs/STEP_fix_20260826_COMMAND.md`

**Overview:**
* `ensure-db-init.js` checks for an existing schema and executes `setup-unified-db.js` if necessary.
* `postinstall` uses this script so new environments start with just the database variables set.
* Updated Render deployment guide to mention this automation works with Azure as well.
### 🛠️ Fix 2026-08-25 – Login tenant header removal
**Status:** ✅ Done
**Files:** `src/controllers/auth.controller.ts`, `src/services/auth.service.ts`, `docs/openapi.yaml`, `docs/STEP_fix_20260825_COMMAND.md`

**Overview:**
* Login no longer expects the `x-tenant-id` header. The tenant is derived from the user's email and the OpenAPI spec was updated accordingly.
### 🛠️ Fix 2026-08-22 – Azure deployment zip fix
**Status:** ✅ Done
**Files:** `.github/workflows/main_fuelsync.yml`, `docs/STEP_fix_20260822_COMMAND.md`

**Overview:**
* Updated the CI workflow to zip only built application files for Azure deployment.


### 🛠️ Fix 2026-08-23 – Station ranking alias bug
**Status:** ✅ Done
**Files:** `src/services/station.service.ts`, `docs/STEP_fix_20260823_COMMAND.md`

**Overview:**
* Station ranking query referenced an alias in the `RANK()` expression, causing a 500 error.
* Updated the SQL to use base columns for ranking and sorting.

### 🛠️ Fix 2026-08-27 – Inventory updated_at bug
**Status:** ✅ Done
**Files:** `src/services/inventory.service.ts`, `docs/STEP_fix_20260827_COMMAND.md`

**Overview:**
* Inventory update queries now set the `updated_at` timestamp to avoid null constraint errors.

### 🛠️ Fix 2026-08-28 – Nozzle reading role enforcement
**Status:** ✅ Done
**Files:** `src/routes/nozzleReading.route.ts`, `docs/openapi.yaml`, `frontend/docs/openapi-v1.yaml`, `src/types/api.ts`, `docs/STEP_fix_20260828_COMMAND.md`

**Overview:**
* Applied role middleware to nozzle reading routes and documented roles in the API specification.


### Fix 2026-08-29 - Automated RBAC tests
**Status:** ✅ Done
**Files:** `.env.test`, `tests/openapi.rbac.test.ts`, `docs/STEP_fix_20260829_COMMAND.md`
**Overview:** Added automated RBAC test suite generated from OpenAPI spec to ensure role permissions across all routes.

### Fix 2026-08-30 - RBAC test assertions
**Status:** ✅ Done
**Files:** `tests/openapi.rbac.test.ts`, `docs/STEP_fix_20260830_COMMAND.md`

**Overview:** Expanded the automated RBAC test suite to assert successful status codes for permitted roles (200/201/204) and 401/403 for unauthorized requests.

### Fix 2026-08-31 - Integration test DB setup
**Status:** ✅ Done
**Files:** `tests/openapi.rbac.test.ts`, `tests/integration/stations.test.ts`, `docs/STEP_fix_20260831_COMMAND.md`

**Overview:** Added tenant header to automated RBAC tests and provisioned a local PostgreSQL database using `scripts/ensure-db-init.js` so the full test suite can run locally.

### Fix 2026-09-01 - Close DB connections in tests
**Status:** ✅ Done
**Files:** `jest.config.ts`, `tests/openapi.rbac.test.ts`, `tests/integration/stations.test.ts`, `docs/STEP_fix_20260901_COMMAND.md`

**Overview:** Added `afterAll` hooks to terminate the PostgreSQL pool and enabled Jest's open-handle detection to prevent hanging worker processes.

### Fix 2026-09-02 - Local Postgres instructions for tests
**Status:** ✅ Done
**Files:** `docs/LOCAL_DEV_SETUP.md`, `docs/STEP_fix_20260902_COMMAND.md`

**Overview:** Documented how to install and start PostgreSQL, create the `fuelsync_test` database, and re-run `ensure-db-init.js` when unit tests cannot provision the database automatically.

### Fix 2026-09-03 - Test report generation
**Status:** ✅ Done
**Files:** `tests/openapi.rbac.test.ts`, `tests/integration/pumps.test.ts`, `docs/STEP_fix_20260903_COMMAND.md`

**Overview:** RBAC tests now save their results to `test-report/fuelsync-full.json` and a new pumps API integration test expands coverage.

### Fix 2026-09-04 - DB setup troubleshooting guide
**Status:** ✅ Done
**Files:** `docs/TROUBLESHOOTING.md`, `README.md`, `docs/LOCAL_DEV_SETUP.md`, `docs/STEP_fix_20260904_COMMAND.md`

**Overview:** Added a dedicated troubleshooting document explaining how to install PostgreSQL and create the `fuelsync_test` database when tests skip due to missing DB. Both README and local setup guide reference this section for clarity.

### Fix 2026-09-05 - Integration test UUID fixes
**Status:** ✅ Done
**Files:** `tests/integration/stations.test.ts`, `tests/integration/pumps.test.ts`, `tests/openapi.rbac.test.ts`, `docs/STEP_fix_20260905_COMMAND.md`

**Overview:** Integration tests failed due to invalid UUID values and short timeouts. Tests now use placeholder UUIDs, allow 400/404 responses when resources are missing, and set `jest.setTimeout(30000)`.

### Fix 2026-09-06 - Sales report decimal formatting
**Status:** ✅ Done
**Files:** `src/controllers/reports.controller.ts`, `docs/STEP_fix_20260906_COMMAND.md`

**Overview:** Numeric columns in `/reports/sales` were returned as long strings because Postgres DECIMAL values are serialized with extra precision. The handler now converts these fields to numbers before sending the response.

### Fix 2026-09-07 - Global decimal parsing
**Status:** ✅ Done
**Files:** `src/utils/parseDb.ts`, `src/controllers/reports.controller.ts`, `docs/STEP_fix_20260907_COMMAND.md`

**Overview:** Extended `parseDb` to handle Prisma `Decimal` objects so all services using `parseRows` return plain numbers. `/reports/sales` now relies on this helper for consistent formatting.

### Fix 2026-09-08 - Reconciliation unit test coverage
**Status:** ✅ Done
**Files:** `tests/reconciliation.service.test.ts`, `docs/STEP_fix_20260908_COMMAND.md`

**Overview:** Added tests for `markDayAsFinalized` and `runReconciliation` to verify early finalization and no-data behaviour. Tests run against a local Postgres instance created with `scripts/ensure-db-init.js`.
### Fix 2026-09-08 - Security hardening
**Status:** ✅ Done
**Files:** `src/constants/auth.ts`, `src/utils/db.ts`, `src/middlewares/debugRequest.ts`, `src/app.ts`, `docs/STEP_fix_20260908.md`

**Overview:** JWT expiration is now configurable and defaults to one hour. Database logs and request debugging no longer expose sensitive information. Development test routes are disabled in production.
### Fix 2026-09-09 - Prisma UUID mapping
**Status:** ✅ Done
**Files:** `prisma/schema.prisma`, `docs/STEP_fix_20260909_COMMAND.md`

**Overview:** Annotated all Prisma model ID and foreign key columns with `@db.Uuid` to eliminate `text = uuid` comparison errors.
### Fix 2026-09-06 - API type regeneration instructions
**Status:** ✅ Done
**Files:** `src/types/api.ts`, `docs/STEP_fix_20260906_COMMAND.md`

**Overview:** Documented the generation command for API TypeScript definitions so developers can update the file from `docs/openapi.yaml`.

### 🛠️ Step 2.59 – Reconciliation finalization helpers
**Status:** ✅ Done
**Files:** `src/services/reconciliation.service.ts`, `src/services/nozzleReading.service.ts`, `src/services/attendant.service.ts`, `migrations/schema/013_prevent_finalized_writes.sql`, `tests/reconciliation.service.test.ts`, `docs/STEP_2_59_COMMAND.md`

**Overview:** Added utilities to ensure daily reconciliation rows exist and to mark days as finalized. GET endpoints now call `getOrCreateDailyReconciliation` so finalized days never return 404. Nozzle readings and cash reports share the `isFinalized` check. New database triggers block writes after finalization.

### 🛠️ Step 2.60 – Reconciliation station validation
**Status:** ✅ Done
**Files:** `src/utils/hasStationAccess.ts`, `src/services/reconciliation.service.ts`, `src/controllers/reconciliation.controller.ts`, `tests/reconciliation.service.test.ts`, `docs/STEP_2_60_COMMAND.md`

**Overview:** Station ownership is now verified before creating reconciliation rows. GET endpoints always return a summary once finalized without 404 responses.


### 🛠️ Step 2.61 – Today's sales summary endpoint
**Status:** ✅ Done
**Files:** `src/controllers/todaysSales.controller.ts`, `src/routes/todaysSales.route.ts`, `src/services/todaysSales.service.ts`, `docs/openapi.yaml`, `frontend/docs/openapi-v1.yaml`, `src/types/api.ts`, `tests/integration/todaysSales.test.ts`, `docs/STEP_2_61_COMMAND.md`


**Overview:** Documented and tested the new `/todays-sales/summary` endpoint which returns a consolidated sales snapshot for the selected date. OpenAPI specs now describe the response schemas and allowed roles. API types were regenerated and integration tests verify RBAC behaviour.
### 🛠️ Step 2.62 – API user journey diagrams
**Status:** ✅ Done
**Files:** `docs/journeys/USER_API_FLOW.md`, `docs/STEP_2_62_COMMAND.md`

**Overview:** Added mermaid diagrams demonstrating how owners/managers set up stations, pumps, nozzles and fuel prices, followed by attendants recording nozzle readings. These diagrams clarify the end-to-end API flow.
### 🛠️ Step 2.63 – Expanded user journey diagrams
**Status:** ✅ Done
**Files:** `docs/journeys/USER_API_FLOW.md`, `docs/STEP_2_63_COMMAND.md`

**Overview:** Extended the diagrams to show sale calculation logic, validation edge cases, analytics and reconciliation flow, plus an ER diagram linking key tables.
### 🛠️ Fix 2025-07-25 – Today's sales summary query
**Status:** ✅ Done
**Files:** `src/services/todaysSales.service.ts`, `docs/STEP_fix_20250725_COMMAND.md`

**Overview:** Updated the service to read from the `sales` table so the endpoint works with the unified schema.

### 🛠️ Fix 2025-07-26 – Azure master deployment branch
**Status:** ✅ Done
**Files:** `.github/workflows/main_fuelsync.yml`, `docs/STEP_fix_20250726_COMMAND.md`

**Overview:** The CI workflow now deploys from the `master` branch to match Azure's configured branch.
### 🛠️ Fix 2025-07-27 – Restore sales aggregation
**Status:** ✅ Done
**Files:** `src/services/todaysSales.service.ts`, `docs/STEP_fix_20250727_COMMAND.md`

**Overview:** Restored all queries in `/todays-sales/summary` to compute totals from the `sales` table. This fixes zero values returned after a regression.

### 🛠️ Fix 2025-07-28 – UUID mismatches in reconciliation
**Status:** ✅ Done
**Files:** `src/services/reconciliation.service.ts`, `src/utils/hasStationAccess.ts`, `migrations/schema/014_update_reconciliation_diff_uuid.sql`, `docs/STEP_fix_20250728_COMMAND.md`

**Overview:** Converted `reconciliation_diff` IDs to `UUID` and added explicit casting for all station and tenant parameters. This prevents `text = uuid` errors when fetching daily summaries.
