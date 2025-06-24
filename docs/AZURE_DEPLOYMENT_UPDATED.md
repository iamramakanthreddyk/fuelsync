# Azure Deployment Guide

## Deployment Process

### 1. Set Environment Variables in Azure

In the Azure Portal, go to your App Service and add these environment variables:

```
DB_HOST=fuelsync-server.postgres.database.azure.com
DB_PORT=5432
DB_NAME=fuelsync_db
DB_USER=fueladmin
DB_PASSWORD=your_actual_password
```

### 2. Deploy the Application

Push your code to the Azure Git repository:

```bash
git add .
git commit -m "Update deployment with comprehensive database setup"
git push azure master
```

### 3. Run Database Setup Script

Connect to the Azure App Service console and run:

```bash
cd /home/site/wwwroot
npm run setup-db
```

## Testing the Deployment

### 1. SuperAdmin View

Login as SuperAdmin:
- URL: https://fuelsync-frontend.azurewebsites.net/login
- Email: `admin@fuelsync.com`
- Password: `admin123`

You should see:
- Dashboard with tenant metrics
- Tenants page with all 4 tenants
- Plans page with all subscription plans
- Admin Users page with all admin users

### 2. Owner View

Login as Owner:
- URL: https://fuelsync-frontend.azurewebsites.net/login
- Email: `owner@production-tenant.com`
- Password: `admin123`

You should see:
- Dashboard with station metrics
- Stations page with all 3 stations
- Ability to navigate to pumps and nozzles

### 3. API Testing

Test the API endpoints:

```bash
# Get all stations (with tenant ID)
curl -H "x-tenant-id: production_tenant" -H "Authorization: Bearer YOUR_TOKEN" https://fuelsync-api-demo.azurewebsites.net/api/v1/stations

# Get all pumps for a station
curl -H "x-tenant-id: production_tenant" -H "Authorization: Bearer YOUR_TOKEN" https://fuelsync-api-demo.azurewebsites.net/api/v1/pumps?stationId=STATION_ID

# Get all nozzles for a pump
curl -H "x-tenant-id: production_tenant" -H "Authorization: Bearer YOUR_TOKEN" https://fuelsync-api-demo.azurewebsites.net/api/v1/nozzles?pumpId=PUMP_ID
```

## Troubleshooting

### 1. Database Connection Issues

If you see database connection errors:
- Check if the database server is running
- Verify the environment variables are set correctly
- Check if the database firewall allows connections from Azure

### 2. API 502 Errors

If you see 502 Bad Gateway errors:
- Check the Azure App Service logs
- Verify the tenant ID is being passed in the header
- Check if the tenant schema exists

### 3. Authentication Issues

If you can't log in:
- Check if the user exists in the database
- Verify the password is correct
- Check if the tenant is active

## Maintenance

### 1. Database Backups

Set up automated backups for the Azure PostgreSQL database:
1. Go to Azure Portal > PostgreSQL server
2. Navigate to Backups
3. Configure backup retention and frequency

### 2. Monitoring

Set up monitoring for the Azure App Service:
1. Go to Azure Portal > App Service
2. Navigate to Monitoring
3. Configure alerts for errors and performance issues