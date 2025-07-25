# STEP_fix_20250726_COMMAND.md
## Project Context Summary
Azure deployments were failing because the GitHub Actions workflow triggered on the `main` branch while Azure expects the `master` branch. The last recorded step was `STEP_fix_20250725_COMMAND.md`.

## Steps Already Implemented
Fixes through `2025-07-25` are documented in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Update `.github/workflows/main_fuelsync.yml` so the push trigger listens to `master`.
- Record this change in the changelog, phase summary and implementation index.
- Document the fix in this step file.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20250726_COMMAND.md`

