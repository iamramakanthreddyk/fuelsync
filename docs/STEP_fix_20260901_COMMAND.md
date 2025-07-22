# STEP_fix_20260901_COMMAND.md
## Project Context Summary
FuelSync Hub has automated RBAC tests (`tests/openapi.rbac.test.ts`) and a sample integration suite (`tests/integration/stations.test.ts`). Recent executions failed due to mismatched expected status codes and Jest open handle warnings.

## Steps Already Implemented
- Tokens generated in tests via `.env.test` secret
- Automated RBAC coverage iterates over OpenAPI spec
- Integration tests send `x-tenant-id` header and provision local DB

## What to Build Now
- Ensure DB pools close after tests to avoid process leaks
- Enable `detectOpenHandles` and `forceExit` in `jest.config.ts`
- Run `npm ci` if needed and execute `npm run test:unit`

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- This command file
