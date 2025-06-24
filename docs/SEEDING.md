# SEEDING.md — Quick Database Seeding

FuelSync uses one setup script to prepare a demo database. Follow these steps to populate a new instance.

## 1. Connect to PostgreSQL
Set `DATABASE_URL` in your `.env` file to point at any reachable Postgres instance and ensure the server is running.

## 2. Create the Schema
Run all migrations to create the required tables and functions:

```bash
npm run db:migrate:all
```

## 3. Seed Data
Run the setup script to create all tables and insert demo data:

```bash
npm run setup-db
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
