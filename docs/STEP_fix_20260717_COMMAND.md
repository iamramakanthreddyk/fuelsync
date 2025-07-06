# STEP_fix_20260717_COMMAND.md

## Project Context Summary
Dashboard controller endpoints accept an optional `stationId` but do not verify that
the requesting user has access to that station. Other controllers like `sales.controller.ts`
check `public.user_stations` to enforce station-level permissions.

## Steps Already Implemented
All fixes through `2026-07-16` are recorded. Access checks exist in `sales.controller.ts`
and middleware but were missing in dashboard endpoints.

## What to Build Now
- Update `src/controllers/dashboard.controller.ts` to validate station access
  before executing queries. Use the same query pattern as in `sales.controller.ts`.
  Return a 403 error via `errorResponse` when access is denied.
- Add unit tests for `createDashboardHandlers.getSalesSummary` covering access
denied and allowed scenarios.
- Document the fix in the changelog, implementation index and phase summary.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260717_COMMAND.md`
