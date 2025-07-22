# STEP_fix_20260904_COMMAND.md
## Project Context Summary
The automated RBAC and integration tests rely on a local PostgreSQL instance. Documentation already provides fallback instructions but recent runs skipped tests due to missing Postgres. The user requested clearer guidance when DB setup fails.

## Steps Already Implemented
- `.env.test` holds DB credentials
- `scripts/ensure-db-init.js` initializes the database
- `docs/LOCAL_DEV_SETUP.md` and `README.md` mention installing PostgreSQL
- Latest fixes recorded up to `2026-09-03`

## What to Build Now
- Recreate `docs/TROUBLESHOOTING.md` summarizing how to install Postgres and create the `fuelsync_test` database when tests skip
- Link this troubleshooting section from `docs/LOCAL_DEV_SETUP.md` and `README.md`
- Update Phase summary and Changelog

## Required Documentation Updates
- `docs/TROUBLESHOOTING.md`
- `docs/LOCAL_DEV_SETUP.md`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- This command file
