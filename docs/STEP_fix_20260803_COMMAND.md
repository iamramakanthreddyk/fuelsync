# STEP_fix_20260803_COMMAND.md
## Project Context Summary
The sales controller was recently updated and the OpenAPI spec must stay in sync with all backend routes. Several endpoints across controllers are missing from `docs/openapi.yaml`, causing contract drift.

## Steps Already Implemented
Up to `2026-08-02` the OpenAPI file covers most routes and integration tests reference it successfully.

## What to Build Now
- Review every router to ensure all paths exist in `docs/openapi.yaml`.
- Document endpoints including `/sales/analytics`, `/fuel-deliveries/inventory`, `/fuel-prices/validate/{stationId}`, `/fuel-prices/missing`, `/nozzle-readings/can-create/{nozzleId}`, `/nozzle-readings/{id}`, `/pumps/{pumpId}/settings`, `/reconciliation/create`, `/reconciliation/{id}`, `/reconciliation/{stationId}/{date}`, `/admin/tenants/summary`, `/reports/financial/export`, and `/tenants`.
- Update the changelog, phase summary, and implementation index.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/openapi.yaml`
- `docs/STEP_fix_20260803.md`
