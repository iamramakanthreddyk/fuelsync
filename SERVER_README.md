# FuelSync API Server

## Starting the Server

To start the server with TypeScript error checking:

```bash
npm start
```

This will first check for TypeScript errors and then start the server if no errors are found.

If you want to bypass the TypeScript check and start the server directly:

```bash
npm run start:direct
```

## Troubleshooting

If you encounter TypeScript errors when starting the server, fix them and try again.

Common TypeScript errors include:
- Missing type annotations for error objects in catch blocks
- Accessing properties on objects that might be undefined

## Database Setup

Before starting the server, make sure your database is properly set up:

### Quick Setup

To initialize the database with all required tables, data, and users:

```bash
npm run setup-db
```

This will run all migrations and seed the database with demo data.

### Manual Setup Steps

If you prefer to run the steps individually:

1. Check database connection:
   ```bash
   npm run check:db-connection
   ```

2. Run database migrations:
   ```bash
   npm run db:migrate:all
   ```

 3. Seed the database:
    ```bash
    npm run db:seed
    ```

4. Check if users exist in the database:
   ```bash
   npm run check:db
   ```

## Testing

### Complete Test Suite

To run the complete test suite (database setup, seeding, and login tests):

```bash
npm run test:all
```

This will:
1. Check database connection
2. Reset and seed the database using the production seeder
3. Check database users
4. Test login functionality
5. Test API login and generate frontend login code
6. Generate frontend login code for browser testing

### Individual Test Commands

- Test login functionality: `npm run test:simple-login`
- Test API login: `npm run test:api-login`
- Generate frontend login code: `npm run generate:frontend-login`
- Generate login code for a specific user: `npm run frontend:login [role]`
  - Example: `npm run frontend:login owner`
  - Example: `npm run frontend:login superadmin`

### Test Users

The following test users are available:

- SuperAdmin: admin@fuelsync.dev / password
- Owner: owner@demo.com / password
- Manager: manager@demo.com / password
- Attendant: attendant@demo.com / password

Note: The tenant users (owner, manager, attendant) will be automatically matched to their tenant schema.