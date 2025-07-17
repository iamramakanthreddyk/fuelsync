# STEP_fix_20260822_COMMAND.md
## Project Context Summary
The Azure deployment builds successfully but the container exits immediately once started. Logs show that the Node process fails to bind to the expected port and Prisma client is missing during runtime.

## Steps Already Implemented
- Fixes up to `2026-08-21` are logged in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Update `package.json` so the production build generates Prisma client and the start script launches the compiled server.
- Ensure the server listens on the port provided by Azure (`process.env.PORT` or `8080`).
- Document this fix in `CHANGELOG.md`, `PHASE_2_SUMMARY.md`, and append the new row in `IMPLEMENTATION_INDEX.md`.
- Record this command file and create a short summary file `STEP_fix_20260822.md`.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260822.md`
- `docs/STEP_fix_20260822_COMMAND.md`
