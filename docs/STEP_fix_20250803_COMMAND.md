Project Context Summary:
FuelSync Hub multi-tenant SaaS ERP with codex-first workflow. Backend and database implemented; documentation tracked via AGENTS protocol.

Steps already implemented:
Existing OpenAPI spec referenced Express-style paths with duplicate version prefixes, causing contract tests to fail.

What to build now, where, and why:
Normalize path definitions in `docs/openapi.yaml` to use OpenAPI `{param}` syntax and remove duplicated `/api/v1` prefixes. Aligns documentation with actual route structure.

Required documentation updates:
- Update `docs/openapi.yaml`
- Append fix entry to `docs/CHANGELOG.md`
- Append fix entry to `docs/PHASE_2_SUMMARY.md`
- Add row in `docs/IMPLEMENTATION_INDEX.md`
