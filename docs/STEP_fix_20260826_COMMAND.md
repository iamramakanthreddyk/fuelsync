# STEP_fix_20260826_COMMAND.md
## Project Context Summary
Render and Azure deployments use environment variables to configure the database. Currently `postinstall` simply runs migrations. When deploying to a brand new database the schema must first be created.

## Steps Already Implemented
Fix up to `2026-08-25` exist in `IMPLEMENTATION_INDEX.md`. `setup-unified-db.js` installs the initial schema and seeds data.

## What to Build Now
- Create `scripts/ensure-db-init.js` that checks for an existing table and runs `setup-unified-db.js` if none are found, otherwise runs pending migrations.
- Update `package.json` `postinstall` to call this new script after generating Prisma client.
- Expand `RENDER_DEPLOYMENT_GUIDE.md` with notes about automatic setup and mention Azure uses the same env vars.
- Document the fix in changelog, index and phase summary.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260826.md`
- `docs/STEP_fix_20260826_COMMAND.md`
- `docs/RENDER_DEPLOYMENT_GUIDE.md`
