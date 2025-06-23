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

## [Phase 1 - Step 1.15] – Finalize Tenant Schema

**Status:** ✅ Done

### 🟦 Enhancements

* Added DEFERRABLE foreign keys across all tenant tables
* Added index coverage for time-based queries
* Updated reading constraint to allow zero values

### Files

* `migrations/tenant_schema_template.sql`


## [Phase 1 - Step 1.16] – Schema Validation Tools

**Status:** ✅ Done

### 🟩 Features

* Extended `validate-tenant-schema.ts` to check foreign key settings and audit fields
* Added SQL helpers `validate-foreign-keys.sql` and `check-schema-integrity.sql`
* Script prints pass/fail summary for each tenant

### Files

* `scripts/validate-tenant-schema.ts`
* `scripts/validate-foreign-keys.sql`
* `scripts/check-schema-integrity.sql`


## [Phase 1 - Step 1.17] – Seed/Test Utility Functions

**Status:** ✅ Done

### 🟦 Enhancements

* Introduced `seedHelpers.ts` with helper functions to seed tenants and station hierarchy
* Added `schemaUtils.ts` for retrieving tenant schema names
* Documented usage examples in `SEEDING.md`

### Files

* `src/utils/seedHelpers.ts`
* `src/utils/schemaUtils.ts`
* `docs/SEEDING.md`

## [Phase 1 - Step 1.18] – Dev Database via Docker Compose

**Status:** ✅ Done

### 🟦 Enhancements

* Added `docker-compose.yml` for local Postgres
* Created `.env.development` with standard credentials
* Seed and validation scripts now load env vars per `NODE_ENV`

### Files

* `docker-compose.yml`
* `.env.development`
* `scripts/seed-public-schema.ts`
* `scripts/seed-demo-tenant.ts`
* `scripts/seed-tenant-schema.ts`
* `scripts/validate-demo-tenant.ts`
* `scripts/reset-all-demo-tenants.ts`


## [Phase 1 - Step 1.19] – Dev Helper Scripts & Env Validation

**Status:** ✅ Done

### 🟦 Enhancements

* Added shell scripts to start and stop the dev Postgres container
* Implemented `check-env.ts` to verify environment variable loading
* Documented script usage in new `README.md`

### Files

* `scripts/start-dev-db.sh`
* `scripts/stop-dev-db.sh`
* `scripts/check-env.ts`
* `README.md`

## [Phase 1 - Step 1.20] – Basic DB Integrity Tests

**Status:** ✅ Done

### 🟩 Features

* Introduced Jest test suite verifying public schema structure
* Added `jest.config.js` and `npm test` script

### Files

* `tests/db.test.ts`
* `jest.config.js`
* `package.json`


## [Phase 1 - Step 1.21] – Tenant Schema SQL Template

**Status:** ✅ Done

### 🟩 Features

* Added base tenant schema SQL template for runtime provisioning
* Includes `users`, `stations`, `pumps`, `nozzles`, `fuel_prices`, `nozzle_readings`, `sales`

### Files

* `sql/tenant_schema_template.sql`

## [Phase 1 - Step 1.22] – Extended Tenant Tables

**Status:** ✅ Done

### 🟩 Features

* Added `creditors`, `credit_payments`, `fuel_deliveries`, `fuel_inventory` tables to tenant schema

### Files

* `database/tenant_schema_template.sql`

## [Phase 1 - Step 1.23] – Daily Reconciliation Table

**Status:** ✅ Done

### 🟩 Features

* Added `day_reconciliations` table to tenant schema

### Files

* `database/tenant_schema_template.sql`

## [Phase 1 - Step 1.24] – Audit Logs Table

**Status:** ✅ Done

### 🟩 Features

* Added `audit_logs` table for per-tenant action tracking

### Files

* `database/tenant_schema_template.sql`

## [Phase 1 - Step 1.25] – Final Schema Wrap-Up

**Status:** ✅ Done

### 🟩 Features

* Updated `fuel_prices` table with `station_id`, `tenant_id` and price fields
* Added `user_activity_logs` for user events
* Added `validation_issues` table for future QA tracking
* Created `seed-tenant-sample.ts` to insert example prices and logs

### Files

* `database/tenant_schema_template.sql`
* `scripts/seed-tenant-sample.ts`

## [Phase 2 - Step 2.1] – Auth Service & Middleware

**Status:** ✅ Done

### 🟩 Features

* Added JWT authentication service with bcrypt password verification
* Implemented Express middlewares: `authenticateJWT`, `requireRole`, `checkStationAccess`
* Provided `/api/auth/login` route returning signed tokens

### Files

* `src/services/auth.service.ts`
* `src/routes/auth.route.ts`
* `src/middlewares/authenticateJWT.ts`
* `src/middlewares/requireRole.ts`
* `src/middlewares/checkStationAccess.ts`
* `src/utils/jwt.ts`
* `src/constants/auth.ts`
* `src/types/auth.d.ts`
* `package.json`

## [Phase 2 - Step 2.2] – User Management APIs

**Status:** ✅ Done

### 🟩 Features

* Added SuperAdmin user creation and listing endpoints
* Added tenant user creation and listing with plan limit checks
* Password hashing via bcrypt and basic request validation

### Files

* `src/controllers/adminUser.controller.ts`
* `src/controllers/user.controller.ts`
* `src/routes/adminUser.route.ts`
* `src/routes/user.route.ts`
* `src/services/adminUser.service.ts`
* `src/services/user.service.ts`
* `src/validators/user.validator.ts`

## [Phase 2 - Step 2.3] – Station, Pump & Nozzle APIs

**Status:** ✅ Done

### 🟩 Features

* CRUD endpoints for stations with plan limit checks
* Pump creation and listing with per-station limits
* Nozzle management with sales history protection
* Middleware for plan enforcement wrappers

### Files

* `src/controllers/station.controller.ts`
* `src/controllers/pump.controller.ts`
* `src/controllers/nozzle.controller.ts`
* `src/routes/station.route.ts`
* `src/routes/pump.route.ts`
* `src/routes/nozzle.route.ts`
* `src/services/station.service.ts`
* `src/services/pump.service.ts`
* `src/services/nozzle.service.ts`
* `src/middlewares/checkPlanLimits.ts`
* `src/validators/station.validator.ts`
* `src/validators/pump.validator.ts`
* `src/validators/nozzle.validator.ts`

## [Phase 2 - Step 2.4] – Nozzle Readings & Auto Sales

**Status:** ✅ Done

### 🟩 Features

* Endpoint `POST /api/nozzle-readings` records cumulative readings
* Auto-generates sales rows using price at reading time
* Endpoint `GET /api/nozzle-readings` with station/nozzle/date filters

### Files

* `src/controllers/nozzleReading.controller.ts`
* `src/routes/nozzleReading.route.ts`
* `src/services/nozzleReading.service.ts`
* `src/validators/nozzleReading.validator.ts`
* `src/utils/priceUtils.ts`

## [Phase 2 - Step 2.5] – Fuel Pricing Management

**Status:** ✅ Done

### 🟩 Features

* Endpoint `POST /api/fuel-prices` to record station fuel prices
* Endpoint `GET /api/fuel-prices` to retrieve pricing history
* Utility `getPriceAt` for historical price lookup

### Files

* `src/controllers/fuelPrice.controller.ts`
* `src/routes/fuelPrice.route.ts`
* `src/services/fuelPrice.service.ts`
* `src/validators/fuelPrice.validator.ts`

## [Phase 2 - Step 2.6] – Creditors and Credit Sales

**Status:** ✅ Done

### 🟩 Features

* CRUD endpoints for creditors
* Credit payments API with balance updates
* Credit sales validation against available limit

### Files

* `src/controllers/creditor.controller.ts`
* `src/services/creditor.service.ts`
* `src/routes/creditor.route.ts`
* `src/validators/creditor.validator.ts`
* `src/services/nozzleReading.service.ts`
* `src/validators/nozzleReading.validator.ts`

## [Phase 2 - Step 2.7] – Fuel Delivery & Inventory Tracking

**Status:** ✅ Done

### 🟩 Features

* Endpoint `POST /api/fuel-deliveries` to record deliveries
* Endpoint `GET /api/fuel-deliveries` to list deliveries per tenant
* Inventory volume auto-increments with each delivery

### Files

* `src/controllers/delivery.controller.ts`
* `src/services/delivery.service.ts`
* `src/routes/delivery.route.ts`
* `src/validators/delivery.validator.ts`

## [Phase 2 - Step 2.8] – Daily Reconciliation API

**Status:** ✅ Done

### 🟩 Features

* Endpoint `POST /api/reconciliation` to finalize a day per station
* Endpoint `GET /api/reconciliation/:stationId?date=` to fetch summary
* Lock prevents new sales or payments once finalized

### Files

* `src/controllers/reconciliation.controller.ts`
* `src/services/reconciliation.service.ts`
* `src/routes/reconciliation.route.ts`
* `src/services/nozzleReading.service.ts`
* `src/services/creditor.service.ts`
* `docs/BUSINESS_RULES.md`

## [Phase 2 - Step 2.9] – Global Auth Enforcement

**Status:** ✅ Done

### 🟩 Features

* `/api/auth/login` issues JWT tokens containing user and tenant context
* Middlewares `authenticateJWT`, `requireRole`, and `checkStationAccess` applied across all routes
* New `/admin-api/*` router for super admin endpoints

### Files

* `src/controllers/auth.controller.ts`
* `src/routes/auth.route.ts`
* `src/routes/adminApi.router.ts`
* `src/middlewares/checkStationAccess.ts`
* `src/middleware/auth.middleware.ts`

## [Phase 2 - Step 2.10] – Backend Cleanup, Tests & Swagger

**Status:** ✅ Done

### 🟩 Features

* Added Swagger documentation route `/api/docs`

### 🟦 Enhancements

* Added Jest unit tests for core services and auth flow

### 🟥 Fixes

* Introduced centralized error handler returning `{ status, code, message }`

### Files

* `src/app.ts`
* `src/docs/swagger.ts`
* `src/routes/docs.route.ts`
* `src/middlewares/errorHandler.ts`
* `src/utils/db.ts`
* `tests/*`

## [Phase 2 - Step 2.11] – Jest DB Test Infrastructure

**Status:** ✅ Done

### 🟩 Features

* Global Jest setup/teardown creates and drops a dedicated test schema
* Introduced `.env.test` for isolated database configuration

### 🟦 Enhancements

* Added `test:db` npm script using `cross-env`
* Extended auth service tests to verify bcrypt usage

### Files

* `jest.config.js`
* `tests/setup.ts`
* `tests/teardown.ts`
* `tests/utils/db-utils.ts`
* `.env.test`
* `tests/auth.service.test.ts`

## [Phase 2 - Step 2.12] – Test DB Bootstrap & Helpers

**Status:** ✅ Done

### 🟩 Features

* `scripts/init-test-db.ts` bootstraps a dedicated test database
* Added `jest.setup.js` to initialize DB before tests
* Utility helpers `tests/utils/testClient.ts` and `tests/utils/testTenant.ts`

### 🟦 Enhancements

* `package.json` test scripts load env and setup file
* Renamed `jest.config.js` → `jest.config.ts`

### Files

* `.env.test`
* `scripts/init-test-db.ts`
* `jest.setup.js`
* `jest.config.ts`
* `tests/utils/testClient.ts`
* `tests/utils/testTenant.ts`

## [Phase 2 - Step 2.13] – Independent Backend Test Execution

**Status:** ✅ Done

### 🟦 Enhancements

* Added `jest.globalSetup.ts` and `jest.globalTeardown.ts` for automated test DB provisioning
* New scripts `scripts/create-test-db.ts` and `scripts/seed-test-db.ts`
* Updated Jest config and test script to use `.env.test` and run in-band
* Global setup now skips tests gracefully if PostgreSQL is unavailable
* Documented installing PostgreSQL locally for tests; updated seed logic and
  migration order to run without errors

### Files

* `jest.globalSetup.ts`
* `jest.globalTeardown.ts`
* `scripts/create-test-db.ts`
* `scripts/seed-test-db.ts`
* `jest.config.ts`

### 🟢 Dev Setup
* Documented local Postgres setup and seeding in `LOCAL_DEV_SETUP.md`
* Fixed seed scripts and station services to run without optional fields

## [Fix - 2025-06-23] – OpenAPI Spec

### 🟩 Features
* Added static OpenAPI file `docs/openapi.yaml` consolidating all endpoints

### Files
* `docs/openapi.yaml`
* `docs/STEP_fix_20250623.md`

## [Fix - 2025-06-24] – Local Dev Test Setup

### 🟢 Dev Setup
* Expanded `LOCAL_DEV_SETUP.md` with instructions to run tests
* Referenced `docs/openapi.yaml` in `README.md`

## [Fix - 2025-06-25] – Endpoint Review Notes

### 🟦 Enhancements
* Documented missing `paymentMethod` field for nozzle readings
* Noted absence of pump/nozzle update endpoints
* Added request body details to `/api/nozzle-readings` in OpenAPI spec

### Files
* `docs/STEP_fix_20250625.md`
* `docs/openapi.yaml`
* `docs/PHASE_2_SUMMARY.md`

## [Fix - 2025-06-26] – Clarify Test DB Setup

### 🟢 Dev Setup
* Added reminder in `LOCAL_DEV_SETUP.md` to start PostgreSQL before running tests
* `PHASE_2_SUMMARY.md` updated with the same note

### Files
* `docs/STEP_fix_20250626.md`
* `docs/LOCAL_DEV_SETUP.md`
* `docs/PHASE_2_SUMMARY.md`

## [Fix - 2025-06-27] – Local DB Install & Tests

### 🟢 Dev Setup
* Documented Docker Compose requirement in `LOCAL_DEV_SETUP.md`
* Added troubleshooting note for `docker-compose` missing
* Verified database setup and ran all Jest suites successfully

### Files
* `docs/STEP_fix_20250627.md`
* `docs/LOCAL_DEV_SETUP.md`
* `docs/TROUBLESHOOTING.md`

## [Fix - Step 2.CRITICAL_FIXES] – Backend Hardening

### 🟥 Fixes
* Added PostgreSQL connection pooling
* Added missing indexes for sales and user relations
* Versioned routes under `/v1`
* Introduced `errorResponse` helper and updated controllers

### Files
* `src/db/index.ts`
* `migrations/003_add_indexes.sql`
* `src/utils/errorResponse.ts`
* tests in `__tests__/`
* `docs/API_GUIDELINES.md`, `docs/SCHEMA_CHANGELOG.md`, `docs/CONTRIBUTING.md`

## [Fix - 2025-07-01] – Test DB Provisioning Guidance

### 🟢 Dev Setup
* Documented fallback instructions when Jest cannot create the test database.

### Files
* `docs/STEP_fix_20250701.md`
* `docs/TROUBLESHOOTING.md`
* `docs/LOCAL_DEV_SETUP.md`
* `docs/PHASE_2_SUMMARY.md`
* `README.md`

## [Fix - 2025-07-02] – Apt Install Reminder

### 🟢 Dev Setup
* Added explicit `sudo apt-get` install commands in fallback docs.

### Files
* `docs/STEP_fix_20250702.md`
* `docs/TROUBLESHOOTING.md`
* `docs/PHASE_2_SUMMARY.md`
* `README.md`

## [Step 2.14] Critical Fixes (Safe Schema & Additional Indexes)
- Added getSafeSchema utility and ServiceError class
- Replaced raw tenant schema interpolation in services
- Added additional indexes for credit payments and fuel prices
- Updated controllers to use ServiceError for consistent errors

## [Fix - 2025-07-03] – Remove uuid-ossp Defaults

### 🛢️ Database
* Removed `uuid-ossp` extension and UUID defaults from migrations.

### Files
* `migrations/001_create_public_schema.sql`
* `migrations/tenant_schema_template.sql`
* `sql/tenant_schema_template.sql`
* `database/tenant_schema_template.sql`
* `docs/STEP_fix_20250703.md`

## [Fix - 2025-07-04] – Test DB UUID & Jest Cleanup

### 🟢 Tests
* Fixed failing Jest setup by inserting a generated UUID when creating the basic plan.
* Updated unit tests to reflect current login response shapes.

### Files
* `scripts/create-test-db.ts`
* `tests/auth.service.test.ts`
* `tests/creditor.service.test.ts`
* `docs/STEP_fix_20250704.md`

## [Fix - 2025-12-19] – Complete Swagger API Documentation

### 🟩 Features
* Fixed empty Swagger UI by replacing JSDoc-based generation with comprehensive static specification
* Added all missing API endpoints to Swagger documentation including user management, station hierarchy, credit payments, and fuel management
* Added fuel inventory endpoint with GET `/v1/fuel-inventory` route and controller handler
* Fixed database import path in `app.ts` from `./db` to `./utils/db`

### 🟦 Enhancements
* Updated Swagger specification to use proper `/v1` API versioning
* Added detailed request/response schemas for all endpoints
* Organized endpoints by functional tags (Authentication, User Management, Station Hierarchy, etc.)
* Added proper parameter documentation including required headers and query parameters

### 🟥 Fixes
* Resolved issue where `http://localhost:3000/api/docs` was showing empty page
* Fixed missing routes in API documentation that were implemented but not documented
* Corrected server URL in Swagger spec to match actual API structure

### Files
* `src/docs/swagger.ts` - Complete rewrite with static specification
* `src/app.ts` - Fixed database import path
* `src/routes/delivery.route.ts` - Added fuel inventory route
* `src/controllers/delivery.controller.ts` - Added inventory handler

### API Endpoints Now Documented
* `/v1/auth/login` - User authentication
* `/v1/users` - Tenant user management (GET, POST)
* `/v1/admin/users` - Super admin user management (GET, POST)
* `/v1/stations` - Station management (GET, POST, PUT, DELETE)
* `/v1/pumps` - Pump management (GET, POST)
* `/v1/nozzles` - Nozzle management (GET, POST)
* `/v1/nozzle-readings` - Reading entry and auto-sales (GET, POST)
* `/v1/fuel-prices` - Fuel pricing management (GET, POST)
* `/v1/creditors` - Credit customer management (GET, POST, PUT, DELETE)
* `/v1/credit-payments` - Credit payment processing (GET, POST)
* `/v1/fuel-deliveries` - Fuel delivery logging (GET, POST)
* `/v1/fuel-inventory` - Inventory level viewing (GET)
* `/v1/reconciliation` - Daily reconciliation (GET, POST)

### Validation
* Server starts successfully with `NODE_ENV=development npx ts-node src/app.ts`
* Swagger UI accessible at `http://localhost:3000/api/docs`
* Swagger JSON available at `http://localhost:3000/api/docs/swagger.json`
* All previously missing routes now properly documented with request/response schemas

## [Step 2.15] – Sales Listing & Tenant Settings API

### 🟩 Features
* Added GET `/v1/sales` with filtering options
* Added GET and POST `/v1/settings` for tenant preferences

### Files
* `src/routes/sales.route.ts`, `src/controllers/sales.controller.ts`, `src/services/sales.service.ts`
* `src/routes/settings.route.ts`, `src/controllers/settings.controller.ts`, `src/services/settings.service.ts`

## [Step 2.16] – Utility Scripts & Fuel Inventory

### 🟩 Features
* Added `/v1/fuel-inventory` endpoint with auto-seeding when empty
* Enhanced auth logic to locate tenant by email when no schema is provided
* Added `start-server.js` and numerous helper scripts for DB checks and login tests
* Created `DB_AUTH_TROUBLESHOOTING.md` and `SERVER_README.md`
* Added initial frontend planning documents under `docs/Frontend`

### Files
* `start-server.js`, `scripts/*.ts`, `src/services/fuelInventory.service.ts`
* `src/controllers/fuelInventory.controller.ts`, `src/routes/fuelInventory.route.ts`
* `src/services/auth.service.ts`, `src/controllers/auth.controller.ts`
* `DB_AUTH_TROUBLESHOOTING.md`, `SERVER_README.md`, `docs/Frontend/*`

## [Step 2.17] – Azure Deployment Restructure

### 🛠 Enhancements
* Renamed entry script to `index.js` for Azure App Service
* Updated start script and added Node `20.x` engines requirement
* Adjusted helper script to launch `index.js`

### Files
* `index.js`, `package.json`, `scripts/start-and-test.js`

## [Fix - 2025-07-05] – Simplify Seeding Scripts

### 🟦 Enhancements
* Consolidated multiple seed utilities into `scripts/seed-production.ts`.
* Updated documentation to describe connecting, migrating and seeding in three steps.

### Files
* `scripts/seed-production.ts` (existing)
* `docs/SEEDING.md`, `docs/LOCAL_DEV_SETUP.md`, `SERVER_README.md`, `docs/TROUBLESHOOTING.md`, `docs/TESTING_GUIDE.md`, `docs/PHASE_1_SUMMARY.md`
* `package.json`, `jest.globalSetup.ts`, `scripts/init-db.js`

## [Fix - 2025-07-06] – Ensure cross-env Available for Tests

### 🟥 Fixes
* Moved `cross-env` from devDependencies to dependencies so `npm test` works in clean environments.

### Files
* `package.json`, documentation updates

## [Fix - 2025-07-07] – TypeScript typings on Azure

### 🟥 Fixes
* Moved `@types/node` to dependencies so production builds include Node typings.
* Removed `jest` from `tsconfig.json` to avoid missing type errors in Azure.

### Files
* `package.json`, `tsconfig.json`, documentation updates
