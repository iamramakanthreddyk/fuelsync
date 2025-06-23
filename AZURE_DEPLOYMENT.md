# Azure Web App Deployment Guide

## Overview
This guide covers deploying FuelSync API to Azure Web App using direct Git deployment.

## Prerequisites
- Azure account with active subscription
- Azure Web App created (Linux, Node.js 20.x)
- Git installed locally
- Project code ready for deployment

---

## 1. Azure Web App Setup

### Step 1: Create Azure Web App
```bash
# Via Azure CLI (optional)
az webapp create \
  --resource-group fuelsync-api-demo_group \
  --plan ASP-fuelsyncapidemogroup-88a9 \
  --name fuelsync-api-demo \
  --runtime "NODE|20-lts"
```

### Step 2: Configure Application Settings
Go to Azure Portal → App Services → fuelsync-api-demo → Configuration → Application Settings:

```
NODE_ENV=production
PORT=8080
DB_HOST=fuelsync-server.postgres.database.azure.com
DB_USER=fueladmin
DB_PASSWORD=Th1nkpad!2304
DB_NAME=fuelsync_db
JWT_SECRET=your-production-secret
```

### Step 3: Set Startup Command
Configuration → General Settings → Startup Command:
```
npm start
```

---

## 2. Direct Git Deployment

### Step 1: Get Azure Git URL
Azure Portal → App Services → fuelsync-api-demo → Deployment Center → Local Git

**Git Clone URL:**
```
https://fuelsync-api-demo-bvadbhg8bdbmg0ff.scm.germanywestcentral-01.azurewebsites.net:443/fuelsync-api-demo.git
```

### Step 2: Add Azure Remote
```bash
# In your local project directory
git remote add azure https://fuelsync-api-demo-bvadbhg8bdbmg0ff.scm.germanywestcentral-01.azurewebsites.net:443/fuelsync-api-demo.git

# Verify remotes
git remote -v
```

### Step 3: Get Deployment Credentials
**Option A: Download Publish Profile**
- Azure Portal → App Services → fuelsync-api-demo → Overview → Get Publish Profile
- Extract username/password from downloaded file

**Option B: Set Custom Credentials**
- Azure Portal → App Services → fuelsync-api-demo → Deployment Center → FTPS Credentials
- Set custom username/password

### Step 4: Deploy to Azure
```bash
# Push to Azure (will prompt for credentials)
git push azure master

# Or with credentials in URL
git push https://$username:$password@fuelsync-api-demo-bvadbhg8bdbmg0ff.scm.germanywestcentral-01.azurewebsites.net:443/fuelsync-api-demo.git master
```

---

## 3. Deployment Process

### What Happens During Deployment:
1. **Code Transfer:** Git pushes code to Azure
2. **Build Process:** Azure runs `npm install`
3. **Startup:** Azure runs the startup command (`npm start`)
4. **Health Check:** Azure pings the app on port 8080

### Monitoring Deployment:
```bash
# View real-time logs
az webapp log tail --name fuelsync-api-demo --resource-group fuelsync-api-demo_group

# Or via Azure Portal
# App Services → fuelsync-api-demo → Monitoring → Log Stream
```

---

## 4. Verification

### Step 1: Check App Status
```bash
# Test health endpoint
curl https://fuelsync-api-demo-bvadbhg8bdbmg0ff.germanywestcentral-01.azurewebsites.net/health

# Expected response:
{
  "status": "ok",
  "env": "production",
  "port": 8080,
  "timestamp": "2025-06-23T17:00:00.000Z"
}
```

### Step 2: Test API Endpoints
```bash
# Test root endpoint
curl https://fuelsync-api-demo-bvadbhg8bdbmg0ff.germanywestcentral-01.azurewebsites.net/

# Test login endpoint
curl -X POST https://fuelsync-api-demo-bvadbhg8bdbmg0ff.germanywestcentral-01.azurewebsites.net/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fuelsync.dev","password":"password"}'
```

---

## 5. Troubleshooting

### Common Issues:

**1. Authentication Failed**
```bash
# Solution: Check deployment credentials
# Azure Portal → Deployment Center → FTPS Credentials
```

**2. Build Failures**
```bash
# Check package.json scripts
# Ensure "start" script exists and is correct
```

**3. App Won't Start**
```bash
# Check logs in Azure Portal
# App Services → Monitoring → Log Stream
# Verify startup command and port configuration
```

**4. CORS Issues**
```bash
# Verify CORS configuration in app.js
# Check allowed origins include your frontend domain
```

---

## 6. Development Workflow

### Daily Development:
```bash
# 1. Make changes locally
# 2. Test locally
npm run dev

# 3. Commit changes
git add .
git commit -m "Your changes"

# 4. Deploy to Azure
git push azure master

# 5. Verify deployment
curl https://fuelsync-api-demo-bvadbhg8bdbmg0ff.germanywestcentral-01.azurewebsites.net/health
```

### Environment Management:
- **Local:** Uses `.env.development` file
- **Azure:** Uses Application Settings in portal
- **Database:** Same Azure PostgreSQL for both environments

---

## 7. Production Considerations

### Security:
- Use strong JWT secrets
- Enable HTTPS only
- Configure proper CORS origins
- Set up authentication for admin endpoints

### Performance:
- Enable Application Insights for monitoring
- Configure auto-scaling if needed
- Set up health checks

### Backup:
- Regular database backups
- Source code in Git repository
- Export Application Settings

---

## 8. Alternative Deployment Methods

### GitHub Actions (CI/CD):
```yaml
# .github/workflows/azure-deploy.yml
name: Deploy to Azure
on:
  push:
    branches: [master]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: azure/webapps-deploy@v2
        with:
          app-name: fuelsync-api-demo
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

### ZIP Deploy:
```bash
# Create deployment package
zip -r deploy.zip . -x "node_modules/*" ".git/*"

# Upload via Kudu
# https://fuelsync-api-demo-bvadbhg8bdbmg0ff.scm.germanywestcentral-01.azurewebsites.net/ZipDeploy
```

---

## 9. Useful Commands

```bash
# View app logs
az webapp log tail --name fuelsync-api-demo --resource-group fuelsync-api-demo_group

# Restart app
az webapp restart --name fuelsync-api-demo --resource-group fuelsync-api-demo_group

# View app settings
az webapp config appsettings list --name fuelsync-api-demo --resource-group fuelsync-api-demo_group

# Set app setting
az webapp config appsettings set --name fuelsync-api-demo --resource-group fuelsync-api-demo_group --settings KEY=VALUE
```

---

## Summary

The Azure deployment process using direct Git push is:
1. **Setup:** Configure Azure Web App and get Git URL
2. **Connect:** Add Azure as Git remote
3. **Deploy:** Push code directly to Azure Git
4. **Monitor:** Check logs and test endpoints
5. **Iterate:** Repeat for updates

This method provides direct control over deployments and real-time feedback during the deployment process.