# TESTING_GUIDE.md — Running the FuelSync Test Suite

This guide describes how to run unit and e2e tests for FuelSync Hub.

1. Ensure the Postgres database specified in `.env.development` is running. Use:

```bash
./scripts/start-dev-db.sh
```

2. Install dependencies and run tests:

```bash
npm install
npm test
```

Tests use Jest with `ts-jest` and connect to the development database by default. Service tests mock database calls while `tests/db.test.ts` expects a reachable Postgres instance.

Sample coverage includes authentication, nozzle readings, creditors and reconciliation logic. E2E tests verify the login flow and protected routes.
