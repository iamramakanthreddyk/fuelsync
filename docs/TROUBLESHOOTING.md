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

## 🐘 Test DB Provisioning Failure

**Symptom:** `npm test` prints `Skipping tests: unable to provision test DB.`

**Cause:** The Jest global setup couldn't create `fuelsync_test` because
`psql` is missing or the development database container isn't running.

**Fix:**

* Ensure PostgreSQL is installed and `psql` is on your `PATH`, or start the
  Docker database with `./scripts/start-dev-db.sh`.
  On Ubuntu/Debian:

  ```bash
  sudo apt-get update && sudo apt-get install -y postgresql
  ```
* Rerun `npm test` once the database is available. The setup script will
  create and seed `fuelsync_test` automatically.

---

## 🐳 Docker Compose Issues

**Symptom:** `docker-compose up` fails or database container won't start.

**Fix:**

* Ensure port `5432` is free or change `DB_PORT` in `.env.development`
* Remove old volumes via `docker volume rm fuelsync_pgdata`
* Install Docker and Docker Compose if `docker-compose` is not found

---

> Update this file frequently during QA or new phase onboarding.

