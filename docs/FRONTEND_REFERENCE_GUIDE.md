# FRONTEND_REFERENCE_GUIDE.md — Authoritative Implementation Guide

This guide clarifies how the frontend stays in sync with the backend and database.
Always consult this file before implementing UI changes.

## Canonical API Specification

The OpenAPI contract lives at `docs/openapi.yaml`. Any schema or endpoint change must be reflected here. The previous file `frontend/docs/openapi-v1.yaml` remains for historical reference only.

## Update Flow

1. **Database** – adjust migrations and seed scripts.
2. **Scripts** – update helper scripts.
3. **db_brain.md** – record structural reasoning.
4. **Backend** – update services and routes.
5. **OpenAPI** – sync `docs/openapi.yaml`.
6. **Frontend** – update components and hooks based on the spec.

Refer to `frontend/docs/api-diff.md` for any temporary gaps between the spec and implementation.
