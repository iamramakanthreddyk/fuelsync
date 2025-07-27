Project Context Summary:
- TypeScript types for API are generated from the OpenAPI spec but lack regeneration instructions.
Steps already implemented: see docs/IMPLEMENTATION_INDEX.md up to 2026-09-05

Task:
- Add a comment at the top of `src/types/api.ts` indicating it is generated from `docs/openapi.yaml`.
- Provide the regeneration command using `npx openapi-typescript`.
- Update docs (CHANGELOG, PHASE_2_SUMMARY, IMPLEMENTATION_INDEX).

Required documentation updates: CHANGELOG.md entry, PHASE_2_SUMMARY.md entry, IMPLEMENTATION_INDEX.md row.
