# FRONTEND_REFERENCE_GUIDE.md — Authoritative Implementation Guide

This guide clarifies how the frontend stays in sync with the backend and database.
Always consult this file before implementing UI changes.

## Canonical API Specification

The OpenAPI contract lives at `docs/openapi.yaml`. Any schema or endpoint change must be reflected here. The previous file `frontend/docs/openapi-v1.yaml` remains for historical reference only.

## Update Flow

1. **Database** – adjust migrations and seed scripts.
2. **Scripts** – update helper utilities.
3. **db_brain.md** – record structural reasoning.
4. **Backend** – update services and routes.
5. **backend_brain.md** – document API or behaviour changes.
6. **OpenAPI** – sync `docs/openapi.yaml`.
7. **Frontend** – update components and hooks based on the spec.
8. **Docs** – update this guide and `frontend/docs/api-diff.md` as needed.

Refer to `frontend/docs/api-diff.md` for any temporary gaps between the spec and implementation.

## Schema Changes

Schema updates originate in the database. Always consult `DATABASE_MANAGEMENT.md` for the full workflow: migrations, script updates, documenting reasoning in `db_brain.md`, backend changes with notes in `backend_brain.md`, spec updates in `docs/openapi.yaml`, and only then frontend adjustments. Update this guide once those steps are complete so the team knows exactly what changed.
