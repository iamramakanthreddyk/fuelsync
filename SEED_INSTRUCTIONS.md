# Database Seed Instructions

## Local Setup

1. **Create a `.env` file with your database credentials:**

```
# Database connection
DB_HOST=fuelsync-server.postgres.database.azure.com
DB_PORT=5432
DB_NAME=fuelsync_db
DB_USER=fueladmin
DB_PASSWORD=your_actual_password_here
DB_SSL=true

# Server settings
PORT=3003
NODE_ENV=development
```

2. **Run the seed script:**

```bash
npm run seed
```

## Azure Deployment

### Option 1: Using Azure Portal

1. Go to your App Service in Azure Portal
2. Navigate to **Configuration** > **Application settings**
3. Add the following settings:
   - `DB_HOST`: fuelsync-server.postgres.database.azure.com
   - `DB_PORT`: 5432
   - `DB_NAME`: fuelsync_db
   - `DB_USER`: fueladmin
   - `DB_PASSWORD`: your_actual_password
   - `DB_SSL`: true

4. Save the settings
5. Open the **Console** tool in Azure Portal
6. Run the following commands:
   ```bash
   cd /home/site/wwwroot
   npm run seed
   ```

### Option 2: Using Azure CLI

```bash
# Set environment variables
az webapp config appsettings set --name fuelsync-api-demo --resource-group your-resource-group --settings DB_HOST=fuelsync-server.postgres.database.azure.com DB_PORT=5432 DB_NAME=fuelsync_db DB_USER=fueladmin DB_PASSWORD=your_actual_password DB_SSL=true

# Restart the app
az webapp restart --name fuelsync-api-demo --resource-group your-resource-group

# Run the seed script via SSH
az webapp ssh --name fuelsync-api-demo --resource-group your-resource-group
cd /home/site/wwwroot
npm run seed
```

## Verifying Seed Success

After running the seed script, you should see output like:

```
Starting production seed...
Connected to database
Dropped existing schemas and tables
Created public tables
Created tenant tables
Inserted users
Inserted stations
Inserted pumps
Inserted nozzles
Inserted fuel prices and inventory
Inserted creditors
Inserted 620 readings and 120 sales
Inserted 6 credit payments
Inserted fuel deliveries
Seed completed successfully
```

## Troubleshooting

### Connection Issues

If you see `ECONNREFUSED` errors:
- Verify your database host is correct
- Check if your IP is allowed in the database firewall
- Verify the database user has proper permissions

### SSL Issues

If you see SSL-related errors:
- Make sure `DB_SSL=true` is set
- Try setting `rejectUnauthorized: false` in the SSL options

### Permission Issues

If you see permission errors:
- Verify the database user has CREATE/DROP permissions
- Check if the user can create schemas and tables