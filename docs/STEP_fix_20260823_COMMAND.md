# STEP_fix_20260823_COMMAND.md
## Project Context Summary
The backend must run reliably on Azure App Service using a custom Docker image. Previous deployments via Oryx caused permission errors and missing Prisma binaries. We need a Dockerfile that builds the app with Prisma and exposes port 8080. The start command should be `node server.js` and a Prisma-aware `/health` endpoint is required.

## Steps Already Implemented
Fixes through `2026-08-22` are logged in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Create a `Dockerfile` using Node 22 Alpine that installs dependencies, runs `npx prisma generate`, and uses `CMD ["npm","start"]`.
- Update `package.json` scripts and dependencies as required for production start with `node server.js` and Prisma generation during `postinstall`.
- Add `server.js` entry point that listens on `process.env.PORT || 8080` and exposes a `/health` endpoint checking Prisma connection.
- Adjust existing `/health` handler in `src/app.ts` to use Prisma.
- Add optional GitHub Actions workflow for Docker deploy to Azure.
- Document changes in changelog, phase summary and implementation index.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260823.md`
- `docs/STEP_fix_20260823_COMMAND.md`
