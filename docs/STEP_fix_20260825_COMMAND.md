# STEP_fix_20260825_COMMAND.md
## Project Context Summary
The repository currently includes a Docker-based GitHub Actions workflow for deploying the backend to Azure. We now want a simpler deployment using the built Node application and the `azure/webapps-deploy` action. The container workflow should be removed.

## Steps Already Implemented
Fixes through `2026-08-24` are logged in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Delete `.github/workflows/docker-azure.yml`.
- Add new workflow `.github/workflows/azure-webapp.yml` using node build and zip deployment.
- Document the update in changelog, phase summary, and implementation index.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260825.md`
- `docs/STEP_fix_20260825_COMMAND.md`
