# AZURE_DEV_SETUP.md — Developing Against an Azure DB

Developers may connect their local FuelSync instance to an Azure PostgreSQL
server instead of using Docker. This requires the same environment variables as
the deployment guide.

## 1. Configure `.env`
Set the Azure connection details:

```
DB_HOST=<azure-hostname>
DB_PORT=5432
DB_USER=<admin-user>
DB_PASSWORD=<password>
DB_NAME=<database-name>
```

Keep `NODE_ENV=development` so local logging and hot reload remain enabled.

## 2. Apply the Schema
The helper script `scripts/setup-azure-schema.js` applies the unified schema with
Azure-compatible settings. Run:

```bash
node scripts/setup-azure-schema.js
```

This only needs to be run once for a new database. It skips when executed inside
Codex or CI environments.

## 3. Seed Data
After the schema is created you can seed demo records:

```bash
npm run setup-azure-db
```

The script checks the connection, runs pending migrations, generates the Prisma
client and seeds initial data.

## 4. Start the Server
Run the server as usual:

```bash
npm exec ts-node src/app.ts
```

Your local instance will now use the Azure-hosted database.
