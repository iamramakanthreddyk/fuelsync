# STEP_fix_20260813_COMMAND.md
## Project Context Summary
The previous fix added display fields for nozzle readings and inventory. However, the
fuel inventory status values and active price calculation needed adjustment, and API type generation was failing due to a YAML issue. We must correct these issues and regenerate types.

## Steps Already Implemented
- Fields added via `STEP_fix_20260812.md`.

## What to Build Now
- Update `fuelInventory.service` to compute status as `normal`, `low`, or `critical`.
- Include validFrom in fuel price `isActive` calculation.
- Add `status` enum to `FuelInventory` in `docs/openapi.yaml`.
- Regenerate `src/types/api.ts` using `openapi-typescript`.
- Ensure nozzle reading queries compute volume and amount when sales data is absent.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260813.md`
- `docs/STEP_fix_20260813_COMMAND.md`
