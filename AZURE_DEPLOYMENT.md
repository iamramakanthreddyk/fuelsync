# Azure Deployment Guide

## Database Setup

### 1. Set Environment Variables in Azure

In the Azure Portal, go to your App Service and add these environment variables:

```
POSTGRES_HOST=fuelsync-server.postgres.database.azure.com
POSTGRES_PORT=5432
POSTGRES_DATABASE=fuelsync_db
POSTGRES_USER=fueladmin
POSTGRES_PASSWORD=your_actual_password
```

### 2. Run the Azure Seed Script

Connect to the Azure App Service console and run:

```bash
cd /home/site/wwwroot
npm run azure-seed
```

This script:
- Uses Azure PostgreSQL environment variables
- Enables SSL for secure connection
- Creates all required tables and seed data

## Frontend Configuration

### 1. Set API URL in Frontend

In your frontend `.env` file:

```
VITE_API_BASE_URL=https://fuelsync-api-demo-bvadbhg8bdbmg0ff.germanywestcentral-01.azurewebsites.net/api/v1
VITE_DEFAULT_TENANT=production_tenant
```

### 2. Ensure Headers in API Requests

All API requests should include:

```
Authorization: Bearer YOUR_TOKEN
x-tenant-id: production_tenant
```

## Testing the Deployment

### 1. Login Credentials

```
SuperAdmin: admin@fuelsync.com / admin123
Owner: owner@fuelsync.com / admin123
Manager: manager@fuelsync.com / admin123
Attendant: attendant@fuelsync.com / admin123
```

### 2. Test API Endpoints

```
GET /api/v1/stations
GET /api/v1/pumps
GET /api/v1/nozzles
GET /api/v1/fuel-prices
GET /api/v1/sales
GET /api/v1/creditors
```

## Troubleshooting

### Database Connection Issues

If you see connection errors:

1. Check Azure PostgreSQL firewall rules
2. Verify environment variables are set correctly
3. Ensure SSL is enabled for the connection

### Missing Tables or Data

If tables or data are missing:

1. Run the Azure seed script again
2. Check for errors in the console output
3. Verify the database user has proper permissions

### API 502 Errors

If you see 502 Bad Gateway errors:

1. Check if the tenant ID header is included in requests
2. Verify the database connection is working
3. Check Azure App Service logs for errors

## Maintenance

### Regular Backups

Set up automated backups for the Azure PostgreSQL database:

1. Go to Azure Portal > PostgreSQL server
2. Navigate to Backups
3. Configure backup retention and frequency

### Monitoring

Set up monitoring for the Azure App Service:

1. Go to Azure Portal > App Service
2. Navigate to Monitoring
3. Configure alerts for errors and performance issues