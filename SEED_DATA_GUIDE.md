# FuelSync Seed Data Guide

This guide explains how to seed your FuelSync database with initial data to get the system up and running.

## Overview

The seed script creates the following essential data:

1. **Subscription Plans**:
   - Basic Plan: 2 stations, 4 pumps per station, 2 nozzles per pump
   - Standard Plan: 5 stations, 8 pumps per station, 4 nozzles per pump
   - Premium Plan: 15 stations, 16 pumps per station, 6 nozzles per pump

2. **SuperAdmin User**:
   - Email: admin@fuelsync.com
   - Password: Admin@123

3. **Demo Tenant**:
   - Name: Demo Fuels Ltd
   - Plan: Standard

4. **Tenant Owner**:
   - Email: owner@demofuels.com
   - Password: Owner@123

5. **Demo Station**:
   - Name: Main Street Station
   - Address: 123 Main Street, Cityville

6. **Demo Infrastructure**:
   - 2 pumps with 3 nozzles (petrol, diesel, premium)
   - Fuel prices for all fuel types
   - Initial fuel inventory levels

## Running the Seed Script

To seed your database with this initial data:

1. Ensure your database connection is configured in `.env`
2. Run the seed script:

```bash
node scripts/seed-data.js
```

## After Seeding

Once the seed script completes successfully:

1. **SuperAdmin Access**:
   - Log in to the admin portal using the superadmin credentials
   - You can manage tenants, plans, and system-wide settings

2. **Tenant Owner Access**:
   - Log in to the tenant portal using the tenant owner credentials
   - You can manage the demo station, pumps, and other tenant-specific settings

## Customizing Seed Data

If you need to customize the seed data:

1. Edit `scripts/seed-data.js` to modify the default values
2. Run the script again - it uses upsert operations so it won't create duplicates

## Troubleshooting

If you encounter issues with the seed script:

1. **Database Connection Issues**:
   - Verify your database connection parameters in `.env`
   - Run `npm run check-db` to test the connection

2. **Constraint Violations**:
   - If you get unique constraint errors, the data may already exist
   - The script uses upsert operations to avoid duplicates, but manual cleanup may be needed

3. **Missing Dependencies**:
   - Ensure you have all required packages installed: `npm install`

## Next Steps

After seeding the database:

1. Start the application: `npm run dev`
2. Access the admin portal to verify superadmin login
3. Access the tenant portal to verify tenant owner login
4. Begin configuring additional settings as needed