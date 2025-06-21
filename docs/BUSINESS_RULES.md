# BUSINESS\_RULES.md — Core Logic & Validation Rules

This file consolidates business logic, validation checks, and enforced behaviors in FuelSync Hub. It acts as a single source of truth for any feature enforcement, helpful for Codex agents, developers, and QA engineers.

---

## 🔁 Nozzle Reading & Sales Logic

| Rule                     | Description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| **Cumulative Entry**     | Each nozzle reading is cumulative.                                  |
| **Auto Delta**           | `volume_sold = new_reading - previous_reading`                      |
| **Price Application**    | Fuel price is fetched as of `reading_timestamp`                     |
| **Multiple Entries/Day** | Every delta becomes one sales row                                   |
| **Validation**           | Reading must be ≥ last reading, and belong to same nozzle & station |

**SQL for detecting invalid readings:**

```sql
SELECT * FROM nozzle_readings r
JOIN (
  SELECT nozzle_id, MAX(reading) AS prev
  FROM nozzle_readings
  WHERE recorded_at < r.recorded_at
  GROUP BY nozzle_id
) last ON last.nozzle_id = r.nozzle_id
WHERE r.reading < last.prev;
```

---

## 🧮 Credit Sales Logic

| Rule                 | Description                                    |
| -------------------- | ---------------------------------------------- |
| **Party Must Exist** | Credit sales require a valid `credit_party_id` |
| **Max Limit**        | Block new sales if balance > credit\_limit     |
| **Payment History**  | Recorded in `credit_payments` table            |

**Suggestion:** Add a `check_credit_limit()` trigger before inserting into `sales`.

---

## 💵 Plan Enforcement Logic

| Plan Setting         | Enforced By                                       |
| -------------------- | ------------------------------------------------- |
| `maxStations`        | `beforeCreateStation()` in backend controller     |
| `maxPumpsPerStation` | `checkPumpLimit` middleware in pump routes        |
| `maxNozzlesPerPump`  | `checkNozzleLimit` middleware in nozzle routes    |
| `maxEmployees`       | Checked in user creation service                  |
| `enableCreditors`    | Conditional route guards (e.g., `/api/creditors`) |
| `enableReports`      | Frontend + backend feature flags                  |
| `enableApiAccess`    | API key generation is gated                       |

**Plan source:** `planConfig.ts` — evaluated per tenant at runtime.

---

## 🔐 Authentication & Authorization

| Rule                 | Method                                            |
| -------------------- | ------------------------------------------------- |
| Session must be JWT  | All users authenticate via JWT in HttpOnly cookie |
| Role-specific routes | `requireRole('owner')`, etc.                      |
| Station access check | `user_stations` must include station\_id for user |

Example middleware chain:

```ts
authenticateJWT → requireRole(['manager']) → checkStationAccess → route handler
```

---

## 🔁 Reconciliation Logic

| Rule           | Description                                                        |
| -------------- | ------------------------------------------------------------------ |
| Daily Summary  | For each station: total sales, cash/card split, credit outstanding |
| Auto Calculate | Totals calculated from `sales` table per date                      |
| Finalize Flag  | Locked from edits if `finalized = true`                            |

---

## 🛢 Fuel Price Rules

| Rule                                 | Description                                 |
| ------------------------------------ | ------------------------------------------- |
| New price inserts end previous range | Updates `effective_to` of prior record or trigger |
| Price must be > 0                    | Enforced with `CHECK(price > 0)` |
| Stored per station & fuel type       | Track via `effective_from`/`effective_to` |
| Historical lookup allowed            | Used in sales delta logic     |

---

## ✅ Record Ownership & Integrity

| Entity         | Must Belong To          |
| -------------- | ----------------------- |
| Pumps          | a Station               |
| Nozzles        | a Pump                  |
| Sales          | a Nozzle and User       |
| Credit Payment | a Creditor and Receiver |

All enforced via FK constraints within the active tenant schema.

---

## 📎 Cross-Reference Index

| Section      | File                        |
| ------------ | --------------------------- |
| Auth         | `AUTH.md`                   |
| Seed rules   | `SEEDING.md`                |
| Plans        | `PLANS.md`, `planConfig.ts` |
| Roles        | `ROLES.md`                  |
| Database FKs | `DATABASE_GUIDE.md`         |
| Known issues | `TROUBLESHOOTING.md`        |

> Update this file as new modules and validations are introduced.
