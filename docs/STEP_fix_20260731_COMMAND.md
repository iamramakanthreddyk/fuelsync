# STEP_fix_20260731_COMMAND.md

## Project Context Summary
The previous fixes allowed unit tests to run but several suites still failed to compile. Errors were caused by outdated types in `nozzleReading.service.ts`, the reconciliation service, and a stale test for `listNozzleReadings`.

## Steps Already Implemented
Fixes through `2026-07-30` resolving most Jest issues and adding controller checks.

## What to Build Now
- Correct the last reading query to also select `recorded_at`.
- Adjust reconciliation calculations to avoid passing numbers to `parseFloat`.
- Update `readings.service.test.ts` to use the current `listNozzleReadings` API.
- Document the fix in changelog and phase summary.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260731.md`
