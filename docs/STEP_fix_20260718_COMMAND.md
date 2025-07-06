# STEP_fix_20260718_COMMAND.md

## Project Context Summary
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
- `docs/openapi-spec.yaml`
- `docs/STEP_fix_20260718_COMMAND.md`
