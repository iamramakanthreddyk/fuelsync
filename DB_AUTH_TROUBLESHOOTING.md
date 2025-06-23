# Database Authentication Troubleshooting

If you're experiencing login issues with the message "Invalid email or password", follow these steps to check and fix the database:

## Check Database Connection

First, verify that the database connection is working:

```bash
npm run check:db-connection
```

This will test the database connection and check if the required schemas and tables exist.

## Check Database Users

Run the following command to check if users exist in the database:

```bash
npm run check:db
```

This will show all admin users and tenant users in the database.

## Seed Test Users

If no users are found or you want to reset user credentials, run:

```bash
npm run seed:test-users
```

This will create or update the following test users:

### Admin User
- Email: admin@fuelsync.com
- Password: admin123
- Role: superadmin

### Tenant Users (demo_tenant_001)
- Email: owner@demo-tenant-001.com
- Password: owner123
- Role: owner

- Email: manager@demo-tenant-001.com
- Password: manager123
- Role: manager

- Email: attendant@demo-tenant-001.com
- Password: attendant123
- Role: attendant

## Common Issues

1. **Database Connection**: If the connection check fails, verify your database is running and the .env file has correct credentials.

2. **Missing Users**: If the check shows no users, run the seed script.

3. **Schema Issues**: If you see errors about missing schemas, run the full seed process:
   ```bash
   npm run seed:all
   ```

4. **Password Mismatch**: If you're getting "Invalid password" errors, reset all passwords to a known value:
   ```bash
   npm run reset:passwords
   ```
   This will set all user passwords to "password".

5. **Database Not Initialized**: If the database structure doesn't exist, run the initialization script:
   ```bash
   npm run db:init
   ```
   
   This will run all migrations, seed the database, create test users, and reset passwords.

## Testing Login

After seeding test users, try logging in with the credentials above.