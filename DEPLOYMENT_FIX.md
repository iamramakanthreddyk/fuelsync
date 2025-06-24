# Deployment Fix Guide

## Issues Fixed

### 1. CORS Issues
- Changed CORS policy to allow all origins (`*`) for testing
- This fixes the 502 Bad Gateway errors when accessing API endpoints

### 2. Missing Seed Data
- Created comprehensive seed script (`scripts/seed-production.js`)
- Added all required tables including `fuel_deliveries`
- Added complete seed data for all entities

### 3. TypeScript Build Issues
- Fixed package.json to include all required dependencies
- Added proper tsconfig.json to exclude test files

## How to Deploy

1. **Push the changes to Azure**
   ```bash
   git add .
   git commit -m "Fix deployment issues"
   git push azure master
   ```

2. **Run the Seed Script**
   After deployment, connect to the Azure App Service console and run:
   ```bash
   cd /home/site/wwwroot
   npm run seed
   ```

## Testing the API

### Login Credentials
- **SuperAdmin:** `admin@fuelsync.com / admin123`
- **Owner:** `owner@fuelsync.com / admin123`
- **Manager:** `manager@fuelsync.com / admin123`
- **Attendant:** `attendant@fuelsync.com / admin123`

### Important Headers
When making API requests, include:
```
Authorization: Bearer YOUR_TOKEN
x-tenant-id: production_tenant
```

### Test Endpoints
```
GET /api/v1/stations
GET /api/v1/pumps
GET /api/v1/nozzles
GET /api/v1/fuel-prices
GET /api/v1/sales
GET /api/v1/creditors
```

## Troubleshooting

### If API Still Returns 502
1. Check Azure logs for specific errors
2. Verify the database connection is working
3. Try running the seed script again
4. Check if the tenant ID is being passed correctly

### If Data is Missing
1. Verify the seed script ran successfully
2. Check if you're using the correct tenant ID in requests
3. Verify the JWT token is valid and not expired

### If CORS Issues Persist
1. Check the browser console for specific CORS errors
2. Verify the frontend is sending the correct headers
3. Try using a CORS browser extension for testing

## Next Steps

1. After confirming everything works, consider restricting CORS to specific origins
2. Set up automated database backups
3. Implement proper error logging
4. Add monitoring for API performance