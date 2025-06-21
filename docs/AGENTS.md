# AGENTS.md — Operational Brain of FuelSync Hub

## 🌍 Purpose of the System

**FuelSync Hub** is a multi‑tenant SaaS ERP that digitises daily operations for fuel‑station networks.

*Goals*

1. Capture cumulative nozzle readings ➜ convert to delta‑based sales automatically.
2. Track creditors, fuel deliveries, pricing history, and daily reconciliations.
3. Provide role‑based dashboards (SuperAdmin → Owner → Manager → Attendant).
4. Enforce plan limits (stations, pumps, nozzles, API access, reports).
5. Offer future‑proof integration points (POS, UPI, mobile apps).

---

## 🏗️ Architectural Philosophy

| Principle                    | Detail                                                                     |
| ---------------------------- | -------------------------------------------------------------------------- |
| **Schema‑per‑Tenant**        | Each tenant has its own Postgres schema; platform tables live in `public`. |
| **Modular Domains**          | Readings, Sales, Credit, Inventory, Plans, Reconciliation.                 |
| **RBAC**                     | Four roles with strict scopes.                                             |
| **Audit + Validation First** | DEFERRABLE constraints & service‑layer checks.                             |
| **Codex‑First Workflow**     | All code is generated through AI prompts that update docs & changelogs.    |

---

## 🎢 Evolution Timeline

| Stage                | Highlight                                               |
| -------------------- | ------------------------------------------------------- |
| **MVP**              | Basic readings ➜ delta ➜ sales logic.                   |
| **Domain Expansion** | Added creditors, reconciliation, pricing history.       |
| **Plan Enforcement** | Tenant‑level feature & usage limits.                    |
| **AI Workflow**      | Introduced Codex‑driven build with documentation chain. |

---

## 🔁 Implementation Phases & Order

1. **Phase 1 — Database**
   Full schema, constraints, seed scripts, validation scripts.
2. **Phase 2 — Backend**
   Services, APIs, business logic, auth, plan enforcement.
3. **Phase 3 — Frontend**
   Next.js UI, React Query hooks, dashboards, E2E tests.

*⚠️ Phases must be completed strictly in order.*

---

## 🧑‍💻 Agent Execution Protocol

For **every** new step you perform:

1. **Read context** in this file.
2. **Consult** `docs/IMPLEMENTATION_INDEX.md` for completed & pending steps.
3. **Execute** the next pending step only (no skipping).
4. **Write code** only in the specified file paths.
5. **Update docs**:

   * Append a CHANGELOG entry (Features/Fixes/Enhancements).
   * Append a summary block in `docs/PHASE_X_SUMMARY.md`.
   * Add the step to `docs/IMPLEMENTATION_INDEX.md`.

> If any required documentation update is missing, the step is considered **incomplete**.

---

## 🗂️ Linked Documentation

| File                      | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `BUSINESS_RULES.md`       | Canonical business & validation rules.              |
| `IMPLEMENTATION_INDEX.md` | Master list of all steps and links.                 |
| `CHANGELOG.md`            | Chronological log of features, fixes, enhancements. |
| `PHASE_1_SUMMARY.md`      | Database‑phase details & validations.               |
| `PHASE_2_SUMMARY.md`      | Backend‑phase details & validations.                |
| `PHASE_3_SUMMARY.md`      | Frontend‑phase details & validations.               |

---

## 🚦 Starting Point

> **Current status:** Fresh repository — no code, no migrations.
>
> **Next action for an AI agent:**
>
> `Phase 1 – Step 1.1 : Create public schema migration`
>
> Follow Execution Protocol and update all docs accordingly.
