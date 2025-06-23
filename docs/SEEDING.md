# SEEDING.md — Quick Database Seeding

FuelSync now relies on a single seeding script for all environments. Follow these steps to populate a new database.

## 1. Connect to PostgreSQL
Set `DATABASE_URL` in your `.env` file to point at any reachable Postgres instance and ensure the server is running.

## 2. Create the Schema
Run all migrations to create the required tables and functions:

```bash
npm run db:migrate:all
```

## 3. Seed Data
Execute the production seeder to insert default plans, an admin account and a demo tenant:

```bash
npm run seed:production
```

### What to Test
- Log in with `admin@fuelsync.dev` or `owner@demo.com`.
- Confirm schema `demo_tenant_001` contains stations, pumps and fuel prices.

### Troubleshooting
If seeding fails:
1. Verify the connection string and credentials.
2. Drop any partially created schemas and rerun the migrations.
3. Run the seeder again.

Record persistent issues in `TROUBLESHOOTING.md`.
