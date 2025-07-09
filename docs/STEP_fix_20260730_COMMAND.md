# STEP_fix_20260730_COMMAND.md

## Project Context Summary
New unit tests added in the previous step failed to run because the test database could not be provisioned in the Codex environment. Running `npm run test:unit` also revealed TypeScript compilation errors when dynamically importing controllers.

## Steps Already Implemented
Fixes through `2026-07-29` including controller export checks.

## What to Build Now
- Install PostgreSQL locally to provision the test database.
- Adjust controller export test to read file contents instead of requiring modules.
- Update inventory, nozzle and plan enforcement tests to align with actual logic.
- Add missing type packages `@types/supertest` and `@types/js-yaml`.
- Ensure the selected unit tests pass.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260730.md`
