# STEP_fix_20260830_COMMAND.md
## Project Context Summary
FuelSync Hub uses automated RBAC tests generated from `docs/openapi.yaml` to ensure each route enforces the required roles. Existing tests only checked that allowed roles were not forbidden.

## Steps Already Implemented
- `.env.test` provides JWT secret for generating tokens.
- `tests/openapi.rbac.test.ts` iterates over all operations with `x-roles` to verify access for owner, manager, attendant and unauthenticated users.
- Prior fixes up to `2026-08-29` recorded in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Improve the RBAC test assertions to expect success status codes (200/201/204) for permitted roles and 401/403 for others.
- Attempt to install dependencies and run `npm run test:unit`.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- This command file
