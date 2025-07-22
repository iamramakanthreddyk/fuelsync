Project Context Summary:
- Integration tests failing due to invalid UUIDs and short timeouts
- RBAC tests use placeholder IDs 't1', 's1', 'p1'
Steps already implemented: see docs/IMPLEMENTATION_INDEX.md up to 2026-09-04

Task:
- Update integration tests (stations, pumps, openapi RBAC) to use valid UUIDs
- Increase test timeout with jest.setTimeout(30000)
- Accept 400/404 statuses for allowed RBAC cases and 400 for disallowed POST
- Run npm install, ensure DB init, and run tests
- Update docs (CHANGELOG, PHASE_2_SUMMARY, IMPLEMENTATION_INDEX)

Required documentation updates: CHANGELOG.md entry, PHASE_2_SUMMARY.md entry, IMPLEMENTATION_INDEX.md row.
