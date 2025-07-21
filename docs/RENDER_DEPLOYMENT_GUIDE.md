# RENDER_DEPLOYMENT_GUIDE.md — Deploying FuelSync to Render

This guide explains how to initialise and update the database when hosting FuelSync Hub on Render.

## 1. Configure Environment

1. Provision a PostgreSQL instance on Render.
2. Copy the connection string from the dashboard.
3. In your Render service settings, add an environment variable:

```
DATABASE_URL=<render connection string>
```

The `postinstall` script uses this variable to run migrations.

## 2. Bootstrap the Database

Run the setup script once after creating the database:

```bash
npm run setup-db
```

This applies the master schema, runs all migrations and seeds initial data.

## 3. Automated Migrations

During each deployment Render runs `npm install`. The `postinstall` script now executes:

```bash
prisma generate && node scripts/ensure-db-init.js
```

The script checks whether core tables exist. If the database is brand new it runs `setup-unified-db.js` to create the schema and seed data. Otherwise it simply applies any pending migrations. No data is overwritten and existing tables remain intact.

## 4. Deployment Notes

* The migration runner checks the `schema_migrations` table to avoid reapplying previous migrations.
* Schema creation only runs during `setup-db`; subsequent restarts will not recreate tables.
* Because `ensure-db-init.js` relies solely on the standard environment variables, the same process works on Azure by providing its connection details.
