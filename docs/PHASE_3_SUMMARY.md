# PHASE\_3\_SUMMARY.md — Frontend UI & Dashboard Summary

This document captures the design and progress of **Phase 3: Frontend Development** of FuelSync Hub.

Built with **Next.js 14**, **React 18**, **React Query**, and **Material UI**, the frontend supports multiple roles (SuperAdmin, Owner, Manager, Attendant) and focuses on usability, validation, and modular state handling.

---

## 🎨 Step Format

Each step includes:

* Step ID and Title
* Pages or components created
* Business rules applied
* Validation & API usage
* UI/UX notes

---

### 🖼️ Step 3.1 – Owner Dashboard Page

**Status:** ⏳ Pending
**Pages:** `app/dashboard/page.tsx`, `components/DashboardCard.tsx`

**Modules Displayed:**

* Daily sales volume & revenue
* Nozzle-wise fuel sold
* Cash vs credit vs card breakdown

**Business Rules Covered:**

* Role-based dashboard filtering

**Validation To Perform:**

* API integration with sales and reconciliation endpoints
* Visualise missing data (fallback UI)

---

### 🖼️ Step 3.2 – Manual Reading Entry UI

**Status:** ⏳ Pending
**Pages:** `app/readings/new.tsx`

**Business Rules Covered:**

* One reading ➜ delta ➜ triggers auto-sale
* Reading must be ≥ last known value

**Validation To Perform:**

* Client-side validation for cumulative reading
* Use `useStations`, `usePumps`, `useNozzles` hooks for dropdowns
* Display errors if delta or price lookup fails

---

### 🖼️ Step 3.3 – Creditors View & Payments UI

**Status:** ⏳ Pending
**Pages:** `app/creditors/index.tsx`, `app/creditors/[id]/payments.tsx`

**Business Rules Covered:**

* Credit limit display
* Prevent new sale if overdrawn
* Allow payments with receipt logging

**Validation To Perform:**

* Fetch + display creditor balances
* Add payment form with currency validation

---

### 🖼️ Step 3.4 – SuperAdmin Portal

**Status:** ⏳ Pending
**Pages:** `app/superadmin/tenants.tsx`, `app/superadmin/users.tsx`

**Business Rules Covered:**

* SuperAdmin can create tenants, view logs, manage plans

**Validation To Perform:**

* Form validation for new tenant schema name
* API integration with `/tenants`, `/plans`

---

> 🎯 After building each page or component, update its status and include links to relevant backend and OpenAPI references.

### 📄 Documentation Addendum – 2025-07-13

A new file `frontend/docs/openapi-v1.yaml` captures the full API contract expected by the frontend. Differences between this specification and the backend are tracked in `frontend/docs/api-diff.md`.

### 📄 Documentation Addendum – 2025-11-05

The canonical API specification now resides in `docs/openapi.yaml`.
Refer to `FRONTEND_REFERENCE_GUIDE.md` for the full update flow and spec link.
The older `frontend/docs/openapi-v1.yaml` is kept only for historical reference.

### 📄 Documentation Addendum – 2025-11-07

Instructions for handling new database columns moved to `DATABASE_MANAGEMENT.md`.
`FRONTEND_REFERENCE_GUIDE.md` now points to that guide instead of duplicating the workflow.

### 📄 Documentation Addendum – 2025-11-08

Clarified the update flow in `FRONTEND_REFERENCE_GUIDE.md` to include backend documentation
and the final doc sync step. The schema changes section now explicitly states that
database and backend docs are updated before the frontend adjusts.

### 📄 Documentation Addendum – 2025-11-09

`FRONTEND_REFERENCE_GUIDE.md` now lists a detailed schema change propagation flow starting from the database. Developers should review `DATABASE_MANAGEMENT.md` and `backend_brain.md` for context before updating frontend code.
