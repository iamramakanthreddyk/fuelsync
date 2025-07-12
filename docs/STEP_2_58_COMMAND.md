# STEP_2_58_COMMAND.md
## Project Context Summary
The OpenAPI specification (`docs/openapi.yaml`) now describes all backend routes but no TypeScript types exist for API requests and responses. Previous steps ended at **Step 2.57** with tenant email conventions.

## Steps Already Implemented
- Backend controllers and OpenAPI specification up to `2.57`.
- Documentation and changelog entries for earlier steps.

## What to Build Now
- Use `openapi-typescript` to generate type definitions from `docs/openapi.yaml`.
- Output the generated file to `src/types/api.ts`.
- Add `openapi-typescript` as a dev dependency for repeatable generation.
- Update the changelog, phase summary, and implementation index after generation.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_2_58.md`
