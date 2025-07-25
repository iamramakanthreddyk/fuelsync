# STEP_2_61_COMMAND.md
## Project Context Summary
FuelSync Hub is a multi-tenant ERP for fuel stations. Backend phase implementation is currently complete up to **Step 2.60** which finalized reconciliation helpers. A new endpoint `/todays-sales/summary` was recently added to expose a consolidated sales snapshot for the current day but it is not yet documented in the OpenAPI specification and lacks automated tests.

## Steps Already Implemented
- Backend services and APIs up to **Step 2.60**.
- OpenAPI specs for all previous routes with generated TypeScript types.
- Integration tests validating RBAC for documented endpoints.

## What to Build Now
- Document `GET /todays-sales/summary` in `docs/openapi.yaml` and `frontend/docs/openapi-v1.yaml` including response schemas and `x-roles` for owner, manager and attendant.
- Add new schemas `TodaysSalesSummary`, `TodaysSalesNozzleEntry`, `TodaysSalesByFuel`, `TodaysSalesByStation`, `TodaysCreditSales` under components.
- Regenerate `src/types/api.ts` using `openapi-typescript`.
- Create integration test `tests/integration/todaysSales.test.ts` verifying RBAC for the new endpoint.
- Update CHANGELOG, PHASE_2_SUMMARY and IMPLEMENTATION_INDEX accordingly.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/openapi.yaml`
- `frontend/docs/openapi-v1.yaml`
- `src/types/api.ts`
- `docs/STEP_2_61_COMMAND.md`
