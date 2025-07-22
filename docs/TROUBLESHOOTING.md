# TROUBLESHOOTING.md — Common FuelSync Issues

## Test Database Setup Fails
If `npm test` or `npm run test:unit` prints `Skipping tests: unable to provision test DB`, PostgreSQL may not be installed or running locally.

1. Install PostgreSQL:
   ```bash
   sudo apt-get update && sudo apt-get install -y postgresql
   sudo service postgresql start
   ```
2. Create the test database and set a password if needed:
   ```bash
   sudo -u postgres createdb fuelsync_test
   sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
   ```
3. Initialize schemas and seed data:
   ```bash
   node scripts/ensure-db-init.js
   ```
4. Re-run the tests:
   ```bash
   npm run test:unit
   ```

If you prefer Docker, run `./scripts/start-dev-db.sh` instead of installing PostgreSQL.

