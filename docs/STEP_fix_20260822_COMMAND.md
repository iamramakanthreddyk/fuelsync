# STEP_fix_20260822_COMMAND.md
## Project Context Summary
Render deployment failed because `npm start` ran without compiling TypeScript, so `dist/src/app.js` was missing.

## Steps Already Implemented
Fixes through `2026-08-21` are recorded in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Add a `prestart` script in `package.json` to run `npm run build` before `npm start`.
- Update changelog, phase summary and implementation index.
- Document the change in `docs/STEP_fix_20260822.md`.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260822.md`
- `docs/STEP_fix_20260822_COMMAND.md`
