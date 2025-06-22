# TESTING_GUIDE.md — Running the FuelSync Test Suite

This guide describes how to run unit and e2e tests for FuelSync Hub.

1. Ensure the Postgres database specified in `.env.test` is running. Use:

```bash
./scripts/start-dev-db.sh
```

2. Install dependencies and run tests:

```bash
npm install
npm test
```

The test suite will automatically create the `fuelsync_test` database and seed a demo tenant via `scripts/init-test-db.ts`. Jest loads environment variables from `.env.test` and runs the setup script defined in `jest.setup.js`.

Service tests mock database calls while integration tests create and drop a dedicated schema using the global setup and teardown scripts.

Sample coverage includes authentication, nozzle readings, creditors and reconciliation logic. E2E tests verify the login flow and protected routes.
