# AZURE_DEPLOYMENT_GUIDE.md — Deploying FuelSync to Azure

This guide explains how to provision the database and run the deployment scripts
when hosting FuelSync Hub on Azure PostgreSQL.

## 1. Environment Variables
Create an `.env` file with your Azure connection details. At minimum set:

```
DB_HOST=<azure-hostname>
DB_PORT=5432
DB_USER=<admin-user>
DB_PASSWORD=<password>
DB_NAME=<database-name>
JWT_SECRET=<jwt-secret>
JWT_EXPIRATION=1h
```

The setup scripts use these variables to connect over SSL. Azure requires `ssl`.

## 2. Run the Setup Script
After setting the variables, execute:

```bash
npm run setup-azure-db
```

This script performs the following:
1. Verifies the connection using `scripts/check-db-connection.js`.
2. Applies the unified schema via `scripts/setup-azure-schema.js`.
3. Runs all migrations except those incompatible with Azure.
4. Seeds initial data and generates the Prisma client.

The process prints progress messages and exits on failure.

## 3. Additional Azure Notes
- Ensure your IP is whitelisted in the Azure PostgreSQL firewall settings.
- `setup-azure-schema.js` comments out the `pgcrypto` extension because it is not
  available on managed Azure PostgreSQL.
- All scripts exit early when `CODEX_ENV_NODE_VERSION` or `CI` is set to avoid
  running in automated environments.

Once the script completes, the database is ready for the FuelSync application.
