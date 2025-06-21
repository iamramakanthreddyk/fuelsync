# STEP\_1\_19\_COMMAND.md — Dev Scripts & Env Switching Validation

---

## 🧠 Project Context

FuelSync Hub now has a Docker-based Postgres database and `.env.development` setup. To improve local DX and enforce consistency, we will:

* Add dev utility scripts for starting/stopping database
* Ensure environment selection works as intended

Also, we’ll decide whether to begin basic test infra here or wait until backend logic is scaffolded.

---

## ✅ Prior Steps Implemented

* `docker-compose.yml` defined with Postgres 15
* `.env.development` isolated from `.env`
* Codex uses `dotenv` to load environment vars
* Helpers created to validate schema & seed data

---

## 🛠 Task: Create Local Scripts for DB and Validate `.env` Behavior

### 📂 Files to Create or Modify

* `scripts/start-dev-db.sh`
* `scripts/stop-dev-db.sh`
* `scripts/check-env.ts` (for debug)
* Update README with usage instructions

### 📜 start-dev-db.sh

```bash
#!/bin/bash
echo "Starting FuelSync dev DB..."
docker-compose up -d db
```

### 📜 stop-dev-db.sh

```bash
#!/bin/bash
echo "Stopping FuelSync dev DB..."
docker-compose stop db
```

### 🧪 check-env.ts

```ts
import * as dotenv from 'dotenv';
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}` });

console.log("Environment:", env);
console.log("DB_USER:", process.env.DB_USER);
```

Run via:

```bash
NODE_ENV=development npx ts-node scripts/check-env.ts
```

---

## ❓ Should We Add Tests Now?

We defer full test infra (Jest config, integration tests) to Phase 2 once API routes and services exist. However, a `test/db.test.ts` can be created to:

* Assert table presence
* Check constraint behavior
* Validate deferrable FKs

If desired, add as **Step 1.20**.

---

## 📓 Docs to Update

* [ ] `PHASE_1_SUMMARY.md`: Add script and env validation section
* [ ] `CHANGELOG.md`: Mark CLI/infra enhancement
* [ ] `IMPLEMENTATION_INDEX.md`: Add Step 1.19 with script paths

---

## ✅ Acceptance Criteria

* ✅ `./scripts/start-dev-db.sh` and `stop-dev-db.sh` work
* ✅ `.env.development` loads correctly in scripts
* ✅ `check-env.ts` confirms environment switching
* ✅ No conflicts with future `.env.production` use

---
