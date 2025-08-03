# STEP_fix_20260909_COMMAND.md
## Project Context Summary
Creating nozzle readings fails with `operator does not exist: text = uuid` because several Prisma models treat UUID columns as plain text. When queries compare these columns, Postgres rejects the mismatched types.

## Steps Already Implemented
- All fixes through `2026-09-08` are listed in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Annotate all model `id` and foreign key fields in `prisma/schema.prisma` with `@db.Uuid` so Prisma generates correct queries.
- Run `npx prisma generate` to regenerate the client.
- Update repository documentation (changelog, phase summary, implementation index).
- Record this fix in `STEP_fix_20260909.md`.

## Required Documentation Updates
- `prisma/schema.prisma`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260909.md`
- `docs/STEP_fix_20260909_COMMAND.md`

