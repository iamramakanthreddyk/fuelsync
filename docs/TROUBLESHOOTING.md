# TROUBLESHOOTING.md — Common Issues & Fixes

This file lists known issues, recurring bugs, and their resolutions in FuelSync Hub during development.

---

## 🚫 Invalid Nozzle Reading

**Symptom:** Sales not generated, or validation error.

**Cause:** New reading is lower than previous reading.

**Fix:**

* Ensure readings are strictly increasing
* Check for correct nozzle assignment

---

## ❌ Trigger Errors During Seed

**Symptom:** Constraint failure during seed script.

**Cause:** Insert order violates business rules.

**Fix:**

* Disable immediate triggers (move logic to app)
* Use deferred constraint or handle via code

---

## 📉 Plan Limit Not Enforced

**Symptom:** Extra stations or pumps allowed beyond plan.

**Fix:**

* Ensure plan logic is read dynamically
* Check middleware like `checkPumpLimit`

---

## 🧪 Test Failures

**Symptom:** `jest` fails on `sales.test.ts`.

**Cause:** DB not seeded correctly.

**Fix:**

```bash
npm run db:reset && npm run db:seed
```

---

> Update this file frequently during QA or new phase onboarding.
