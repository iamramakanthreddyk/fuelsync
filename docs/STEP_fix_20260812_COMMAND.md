# STEP_fix_20260812_COMMAND.md
## Project Context Summary
Backend phase is complete up to fix 2026-08-11 which aligned reconciliation request fields. Fuel and nozzle data objects currently expose minimal fields to the frontend. UI components require additional display properties and calculated values.

## Steps Already Implemented
- All fixes through 2026-08-11 recorded in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Extend service methods to return extra fields:
  - `NozzleReading` should include nozzleNumber, previousReading, volume, amount, pricePerLitre, fuelType, stationName, and attendantName.
  - `FuelPrice` list results should include stationName and an `isActive` boolean.
  - `FuelInventory` results should expose minimumLevel and a computed `status` comparing current stock to minimum.
  - `Nozzle` listings should include pumpName for display.
- Update the OpenAPI schemas to document these fields.
- Regenerate `src/types/api.ts` using `openapi-typescript`.
- Document the fix in CHANGELOG, PHASE_2_SUMMARY, and IMPLEMENTATION_INDEX.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/openapi.yaml`
- `src/types/api.ts`
- `docs/STEP_fix_20260812.md`
- `docs/STEP_fix_20260812_COMMAND.md`
