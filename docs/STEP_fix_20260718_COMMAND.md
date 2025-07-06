# STEP_fix_20260718_COMMAND.md

## Project Context Summary
Fuel price validation currently requires `validFrom` but API clients expect it to default to the current date. The database also supports an optional `effective_to` column but the validator ignores it.

## Steps Already Implemented
Fixes through `2026-07-17` include dashboard access checks and Azure docs.

## What to Build Now
- Update `backend/src/validators/fuelPrice.validator.ts` so `validFrom` is optional and defaults to `new Date()`.
- Parse an optional `effectiveTo` and require it be later than `validFrom` when present.
- Propagate these fields in controllers, services and shared API types.
- Document the change in the changelog, implementation index and phase summary.
The canonical OpenAPI specification (`docs/openapi.yaml`) listed the base server path as `/v1` while the backend serves APIs under `/api/v1`. This mismatch also persisted in the legacy `frontend/docs/openapi-v1.yaml`.

## Steps Already Implemented
All fixes up to `2026-07-17` are complete including dashboard access validation.

## What to Build Now
- Update both OpenAPI specification files so the `servers:` section uses `url: /api/v1`.
- Regenerate any derived spec (`docs/openapi-spec.yaml`) so tests consume the corrected path.
- Mention the fix in `docs/CHANGELOG.md` and append a row in `docs/IMPLEMENTATION_INDEX.md`.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/openapi-spec.yaml`
- `docs/STEP_fix_20260718_COMMAND.md`
