# STEP_fix_20260909_COMMAND.md
## Project Context Summary
Creating nozzle readings fails with `operator does not exist: text = uuid` because the Prisma model for `fuel_prices` treats UUID columns as plain text. When `getPriceAtTimestamp` queries prices, Postgres rejects the mismatched types.

## Steps Already Implemented
- All fixes through `2026-09-08` are listed in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Annotate `id`, `tenant_id` and `station_id` in `prisma/schema.prisma`'s `FuelPrice` model with `@db.Uuid` so Prisma generates correct queries.
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

