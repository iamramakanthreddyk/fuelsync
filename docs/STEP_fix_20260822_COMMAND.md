# STEP_fix_20260822_COMMAND.md
## Project Context Summary
Deployments on Azure sometimes start the app before the Prisma client is generated. The `node_modules/.bin/prisma` file also loses execute permissions in certain containers which causes `npx prisma generate` to fail.

## Steps Already Implemented
Fixes through `2026-08-21` are logged in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Add a `prestart` script in `package.json` to `chmod +x node_modules/.bin/prisma` and run `npx prisma generate`.
- Update the `postinstall` script with the same permission fix.
- Change default API port to `8080` in `src/app.ts` so the service listens on that port when `PORT` is unset.
- Document the change in the changelog, phase summary and implementation index.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260822.md`
- `docs/STEP_fix_20260822_COMMAND.md`
