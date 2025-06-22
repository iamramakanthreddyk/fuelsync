# LOCAL_DEV_SETUP.md — Running FuelSync Locally

This guide explains how to set up PostgreSQL, seed the database and run the API
server without Docker.

## 1. Install PostgreSQL

```bash
sudo apt-get update
sudo apt-get install -y postgresql
sudo service postgresql start
```

Set the `postgres` user password and allow password auth:

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo sed -i 's/peer/md5/' /etc/postgresql/16/main/pg_hba.conf
sudo service postgresql restart
```

## 2. Create Dev Database

```bash
sudo -u postgres psql -c "CREATE USER fuelsync PASSWORD 'fuelsync';"
sudo -u postgres psql -c "CREATE DATABASE fuelsync_hub OWNER fuelsync;"
```

Run the public schema migration:

```bash
psql -U postgres -d fuelsync_hub -f migrations/001_create_public_schema.sql
```

## 3. Seed Demo Data

Set a connection string and execute the seed scripts:

```bash
export DATABASE_URL=postgres://fuelsync:fuelsync@localhost:5432/fuelsync_hub
NODE_ENV=development npx ts-node scripts/seed-public-schema.ts
NODE_ENV=development npx ts-node scripts/seed-demo-tenant.ts demo_tenant_001
```

This inserts a superadmin account (`admin@fuelsync.dev` / `password`) and a demo
tenant with owner, manager and attendant users.

## 4. Run the Server

```bash
npm exec ts-node src/app.ts
```

Visit `http://localhost:3000/api/docs` for the Swagger docs. Use the sample
credentials to authenticate and test routes.
