# STEP_fix_20260831_COMMAND.md
## Project Context Summary
FuelSync Hub includes automated RBAC integration tests based on `docs/openapi.yaml` and sample tests for stations endpoints. These tests previously lacked tenant headers causing 500 errors when run locally.

## Steps Already Implemented
- `.env.test` with DB credentials
- `tests/openapi.rbac.test.ts` covers all operations with role-based assertions
- `tests/integration/stations.test.ts` provides station endpoint checks
- Prior fixes recorded up to 2026-08-30

## What to Build Now
- Add `x-tenant-id` header to RBAC tests to match API requirements
- Provision a local PostgreSQL instance and run `scripts/ensure-db-init.js`
- Execute `npm install` and `npm run test:unit` to verify integration tests

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- This command file
