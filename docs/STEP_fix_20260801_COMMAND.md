# STEP_fix_20260801_COMMAND.md
## Project Context Summary
Recent fixes resolved compilation issues but the Jest suite still failed because Jest was missing and integration tests used outdated API paths. The price lookup helper also had wrong field names and attendant service mis-parsed cash totals.

## Steps Already Implemented
Up to `2026-07-31` the services and tests compile but tests cannot run successfully.

## What to Build Now
- Install Node dependencies so Jest is available
- Configure local Postgres and set password for `postgres`
- Fix `src/utils/priceUtils.ts` field names and update its unit test
- Update dashboard and readings service tests to reflect current API
- Prefix integration tests with `/api/v1` and skip obsolete analytics path
- Adjust attendant service cash parsing
- Document changes in changelog, phase summary and implementation index

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260801.md`
