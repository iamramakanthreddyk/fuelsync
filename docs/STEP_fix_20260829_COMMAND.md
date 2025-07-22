# STEP_fix_20260829_COMMAND.md
## Project Context Summary
The repository follows a Codex-first workflow governed by `docs/AGENTS.md`.
Integration tests exist but there is no automated RBAC verification against the OpenAPI spec.

## Steps Already Implemented
- Database initialization scripts and a large Jest test suite (over 250 tests).
- `x-roles` documented in `docs/openapi.yaml` for each secured endpoint.
- Prior fixes up to `2026-08-28` in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Add `.env.test` JWT_SECRET for consistent token generation.
- Create `tests/openapi.rbac.test.ts` that parses `docs/openapi.yaml` and
  automatically tests each operation's access control for `owner`, `manager`,
  `attendant`, and unauthenticated users.
- Ensure all tests run via `npm run test:unit`.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `test-report.md`
- This command file
