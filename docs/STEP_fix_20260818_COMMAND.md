# STEP_fix_20260818_COMMAND.md
## Project Context Summary
Feedback on the reconciliation implementation requested clearer documentation.
The SQL logic, variance meaning, cash difference rules and locking policy
need to be documented for new developers.

## Steps Already Implemented
- Fixes through `2026-08-17` are recorded in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Create new guide `docs/RECONCILIATION_API.md` summarizing the reconciliation flow.
- Explain the SQL query for opening and closing readings and note assumptions.
- Describe the variance formula and cash discrepancy calculation.
- List key reconciliation endpoints in bullet form.
- Note that only one reconciliation per station per day is allowed.
- Update `CHANGELOG.md`, `PHASE_2_SUMMARY.md` and `IMPLEMENTATION_INDEX.md`.
- Document this step in `docs/STEP_fix_20260818.md`.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260818.md`
- `docs/STEP_fix_20260818_COMMAND.md`
- `docs/RECONCILIATION_API.md`
