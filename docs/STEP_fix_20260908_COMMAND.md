# STEP_fix_20260908_COMMAND.md

## Project Context Summary
Security review found several issues: JWT tokens never expired, request debug logs exposed Authorization headers, database utilities printed credentials, and test routes were reachable in production.

## Steps Already Implemented
Latest fix documented in `docs/STEP_fix_20260907_COMMAND.md` improved decimal parsing.

## What to Build Now
- Read JWT expiration from `JWT_EXPIRES_IN` env variable with a secure default.
- Warn if `JWT_SECRET` uses the placeholder value in production.
- Mask Authorization header in `debugRequest` middleware.
- Sanitize database log output to avoid leaking credentials.
- Disable `/test` and `/test-login` routes in production.
- Update changelog, phase summary and implementation index.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- This command file
