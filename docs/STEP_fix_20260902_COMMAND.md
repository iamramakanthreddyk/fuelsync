# STEP_fix_20260902_COMMAND.md
## Project Context Summary
Previous fixes enabled automated RBAC tests and closed PostgreSQL connections. Tests still fail when PostgreSQL isn't installed locally.

## Steps Already Implemented
- `.env.test` provides test DB credentials
- `scripts/ensure-db-init.js` creates schema and seeds data
- RBAC and integration tests run via `npm run test:unit`

## What to Build Now
- Document how to install and start PostgreSQL locally when `npm test` cannot provision the database
- Provide commands to create the `fuelsync_test` DB and run `ensure-db-init.js`
- Update `docs/LOCAL_DEV_SETUP.md` with this troubleshooting section

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- This command file
