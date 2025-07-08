# STEP_fix_20260726_COMMAND.md

## Project Context Summary
Integration tests validating the OpenAPI spec referenced `docs/openapi-spec.yaml`, which has been removed. The current spec lives at `docs/openapi.yaml`. Tests also stripped the `/api` prefix from routes, calling `/v1` endpoints instead of the real `/api/v1` paths.

## Steps Already Implemented
All fixes through `2026-07-25` including attendant route restrictions are complete.

## What to Build Now
- Update `__tests__/integration/api-contract.test.ts` and `__tests__/integration/openapiRoutes.test.ts` to load `docs/openapi.yaml`.
- Remove the `route.replace('/api', '')` logic so requests hit the `/api/v1` endpoints directly.
- Document the change in CHANGELOG, IMPLEMENTATION_INDEX and PHASE summary.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
