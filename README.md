# FuelSync Hub

This project contains the database schema and services for FuelSync Hub. Development uses a Postgres container managed via Docker Compose.

## Running the Dev Database

Use the helper scripts in `scripts/` to start or stop the database:

```bash
./scripts/start-dev-db.sh   # start container in background
./scripts/stop-dev-db.sh    # stop the container
```

The scripts invoke `docker-compose` and expect environment variables from `.env.development` when `NODE_ENV=development`.

To verify environment loading, run:

```bash
NODE_ENV=development npx ts-node scripts/check-env.ts
```

This prints the active environment and database user, confirming `.env.development` was loaded.


## API Documentation

Full API endpoints are documented in [docs/openapi.yaml](docs/openapi.yaml). After starting the server, visit `http://localhost:3000/api/docs` for an interactive Swagger UI.
