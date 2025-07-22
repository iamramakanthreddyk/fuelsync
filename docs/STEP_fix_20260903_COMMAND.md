# STEP_fix_20260903_COMMAND.md
## Project Context Summary
FuelSync Hub backend now has automated RBAC tests from the OpenAPI spec and a sample integration test for station routes. Previous fixes ensured database setup and closed pools. The team now wants a more comprehensive test suite with reports.

## Steps Already Implemented
- `.env.test` holds DB credentials and JWT secret
- `scripts/ensure-db-init.js` initializes the database
- `tests/openapi.rbac.test.ts` iterates over `x-roles` endpoints
- `tests/integration/stations.test.ts` validates RBAC for station APIs

## What to Build Now
- Extend the RBAC tests to record results and output a JSON report under `test-report/fuelsync-full.json`
- Add a new sample integration test `tests/integration/pumps.test.ts` mirroring the station test structure
- Create the `test-report` directory if missing
- Run `npm run test:unit` (may fail if Postgres is unavailable)

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- This command file
