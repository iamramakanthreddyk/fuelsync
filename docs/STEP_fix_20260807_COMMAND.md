# STEP_fix_20260807_COMMAND.md
## Project Context Summary
The OpenAPI specification has grown unwieldy after multiple quick fixes. Some deprecated paths remain and several schemas are inconsistent or incomplete. Enum values are repeated and responses lack standard error definitions. We need a clean spec for future code generation and testing.

## Steps Already Implemented
- Previous steps synced routes and audited the spec up to 2026-08-06.

## What to Build Now
- Remove deprecated paths `/reconciliation/create`, `/settings`, and `/dashboard/daily-trend` from `docs/openapi.yaml`.
- Add `operationId` to each operation and include standard `ErrorResponse` schemas for 400, 401, 403 and 500 responses.
- Ensure listing endpoints accept `limit` and `offset` parameters for pagination.
- Consolidate `fuelType`, `paymentMethod` and status enums across schemas.
- Add placeholder fields to `TenantAnalytics` and verify `SystemHealth` has basic properties.
- Ensure authentication routes have `security: []` while others rely on global bearerAuth and tenantHeader.
- Keep 2-space YAML indentation and alphabetize tags.
- Update documentation (CHANGELOG, PHASE_2_SUMMARY, IMPLEMENTATION_INDEX) and create `STEP_fix_20260807.md` summarising the work.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260807.md`
- `docs/openapi.yaml`
