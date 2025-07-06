# STEP_fix_20260716_COMMAND.md

## Project Context Summary
The README references `AZURE_DEPLOYMENT_GUIDE.md` and `AZURE_DEV_SETUP.md`, but these
documents do not exist. Implementation Index step `1.26` also mentions an Azure
setup guide. We need clear instructions for deploying to Azure and connecting a
development instance to an Azure PostgreSQL database.

## Steps Already Implemented
Fixes through `2026-07-15` are complete. Azure setup scripts like
`scripts/setup-azure-db.js` and `scripts/setup-azure-schema.js` already exist.

## What to Build Now
- Create `docs/AZURE_DEPLOYMENT_GUIDE.md` describing required environment
  variables, how to run `npm run setup-azure-db`, and any special Azure notes.
- Add `docs/AZURE_DEV_SETUP.md` with developer tips for connecting to an Azure
  database locally.
- Link these guides from `README.md` and add a new row in
  `docs/IMPLEMENTATION_INDEX.md`.
- Record the change in `docs/CHANGELOG.md` and append a summary to
  `docs/PHASE_2_SUMMARY.md`.

## Required Documentation Updates
- `docs/AZURE_DEPLOYMENT_GUIDE.md`
- `docs/AZURE_DEV_SETUP.md`
- `README.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
