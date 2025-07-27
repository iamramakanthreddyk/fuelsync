# STEP_fix_20260906_COMMAND.md

## Project Context Summary
The `/reports/sales` endpoint exports raw rows from the `sales` table. Postgres `DECIMAL` fields are returned as high precision strings like `"500.000000000000000000"` which breaks JSON consumers.

## Steps Already Implemented
- Latest fix recorded in `docs/STEP_fix_20260905_COMMAND.md` ensuring tests use valid UUIDs.

## What to Build Now
- Parse numeric fields in `src/controllers/reports.controller.ts` so API responses return numbers instead of long strings.
- Update docs accordingly.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- This command file
Project Context Summary:
- TypeScript types for API are generated from the OpenAPI spec but lack regeneration instructions.
Steps already implemented: see docs/IMPLEMENTATION_INDEX.md up to 2026-09-05

Task:
- Add a comment at the top of `src/types/api.ts` indicating it is generated from `docs/openapi.yaml`.
- Provide the regeneration command using `npx openapi-typescript`.
- Update docs (CHANGELOG, PHASE_2_SUMMARY, IMPLEMENTATION_INDEX).

Required documentation updates: CHANGELOG.md entry, PHASE_2_SUMMARY.md entry, IMPLEMENTATION_INDEX.md row.
