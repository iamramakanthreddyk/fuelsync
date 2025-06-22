# STEP_2_13_COMMAND.md

## 🧠 Project Context

FuelSync Hub is a schema-per-tenant, role-based ERP for fuel stations. This is a Codex-governed project with structured documentation, centralized knowledge in `AGENTS.md`, and strict adherence to `STEP_X_Y_COMMAND.md` conventions.

The backend and database are now complete and independently testable.

---

## 🔁 Previous Steps

- `STEP_2_10_COMMAND.md` finalized backend readiness and Swagger integration.
- `STEP_2_12_COMMAND.md` prepared test infrastructure, confirmed DB bootstrapping and Jest integration.
- Testing failed due to DB pooling and versioning issues not yet resolved.

---

## 🎯 Current Task

**Fix all critical backend design flaws**, ensuring performance, maintainability, and production readiness. All changes must follow AGENTS.md execution rules and update the changelog, implementation index, and documentation.

---

## ✅ Codex Task Summary

### 🔧 Database: Add Connection Pooling
- Replace raw `pg` connection with `Pool` using limits (`max: 10`, `idleTimeoutMillis: 30000`)
- File: `src/db/index.ts`
- Comment: `// Azure-friendly pooling config`

### 📈 Database: Add Missing Indexes
- Create `migrations/003_add_indexes.sql`
- Indexes:
  - `sales.nozzle_id`
  - `sales.created_at`
  - `user_stations.user_id`
  - `pumps.station_id`
- Add to: `docs/SCHEMA_CHANGELOG.md`

### 🧪 API: Enable Versioning
- Prefix all routes with `/v1/...`
- Apply to:
  - `authRoutes`, `userRoutes`, `salesRoutes`, `stationsRoutes`, etc.
- Update Swagger/OpenAPI config
- File: `src/app.ts`
- Add entry to: `docs/API_GUIDELINES.md`

### ⚠️ Errors: Centralize Error Format
- Create `src/utils/errorResponse.ts`
- Use:
  ```ts
  errorResponse(res, 400, 'Missing field: nozzle_id');
