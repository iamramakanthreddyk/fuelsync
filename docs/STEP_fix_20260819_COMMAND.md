# STEP_fix_20260819_COMMAND.md
## Project Context Summary
Frontend developers added a `lastReading` display field on the nozzle card. The API contract requires
this field but the backend's `listNozzles` service does not return it.

## Steps Already Implemented
Fixes up to `2026-08-18` are documented in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Replace `src/services/nozzle.service.ts` with the patched implementation from
  `src/services/nozzle.service.patch.ts` which joins the latest reading.
- Update `CHANGELOG.md`, `PHASE_2_SUMMARY.md` and `IMPLEMENTATION_INDEX.md` with this fix.
- Record the action in `docs/STEP_fix_20260819.md`.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260819.md`
- `docs/STEP_fix_20260819_COMMAND.md`
