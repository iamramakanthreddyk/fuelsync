# FuelSync Development Guide

## Overview
This guide covers setting up FuelSync in three environments:
1. **Local Development** (with Azure PostgreSQL)
2. **Vercel Production** (with Neon PostgreSQL)
3. **Alternative Deployment** (if Vercel issues persist)

## Prerequisites
- Node.js 20.x
- npm or yarn
- Git
- Azure PostgreSQL instance (existing)
- Neon account (for Vercel deployment)

---

## 1. Local Development Setup

### Step 1: Environment Configuration
```bash
# Clone and install
git clone <your-repo>
cd fuelsync
npm install

# Create local environment file
cp .env.example .env.development
```

### Step 2: Configure .env.development
```env
NODE_ENV=development

# Azure PostgreSQL Configuration
DB_HOST=fuelsync-server.postgres.database.azure.com
DB_PORT=5432
DB_USER=fueladmin
DB_PASSWORD=Th1nkpad!2304
DB_NAME=fuelsync_db

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1h
```

### Step 3: Database Setup
```bash
# Run migrations
npm run db:migrate

# Seed with demo data
npm run seed:all

# Verify database
npm run db:status
```

### Step 4: Start Development Server
```bash
# Start server
npm run dev

# Server runs on http://localhost:3001
```

### Step 5: Test Local API
```bash
# Test health endpoint
curl http://localhost:3001/health

# Test admin login (no tenant header)
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fuelsync.dev","password":"password"}'

# Test tenant user login (with tenant header)
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: demo_tenant_001" \
  -d '{"email":"owner@demo.com","password":"password"}'
```

---

## 2. Vercel Production Setup

### Step 1: Create Neon Database
1. Go to [neon.tech](https://neon.tech)
2. Create account and new database
3. Copy connection string (looks like: `postgresql://user:pass@host/db`)

### Step 2: Configure Vercel Environment
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
```
POSTGRES_URL=postgresql://user:pass@host/db
JWT_SECRET=your-production-secret
JWT_EXPIRATION=1h
NODE_ENV=production
```

### Step 3: Deploy to Vercel
```bash
# Push to trigger deployment
git add .
git commit -m "Deploy to Vercel"
git push origin main

# Or deploy directly
vercel --prod
```

### Step 4: Initialize Production Database
```bash
# Run migration endpoint
curl https://your-app.vercel.app/migrate

# Expected response:
# {"status":"success","message":"Database migrated and seeded"}
```

### Step 5: Test Production API
```bash
# Test health
curl https://your-app.vercel.app/health

# Test login
curl -X POST https://your-app.vercel.app/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fuelsync.dev","password":"password"}'
```

---

## 3. Troubleshooting Common Issues

### CORS Issues on Vercel
If you get 401 Unauthorized on OPTIONS requests:

**Solution 1: Use Vercel API Routes**
Create `pages/api/auth/login.ts`:
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { createAuthController } from '../../../src/controllers/auth.controller';
import pool from '../../../src/utils/db';

const authController = createAuthController(pool);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tenant-id');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'POST') {
    return authController.login(req, res);
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
```

**Solution 2: Alternative Deployment**
Consider Railway, Render, or DigitalOcean App Platform if Vercel CORS issues persist.

### Database Connection Issues
```bash
# Check connection
curl https://your-app.vercel.app/health

# Common fixes:
# 1. Verify POSTGRES_URL format
# 2. Check Neon database is active
# 3. Verify environment variables are set
```

### Migration Failures
```bash
# Check what tables exist
curl https://your-app.vercel.app/schemas

# Re-run migration
curl -X POST https://your-app.vercel.app/migrate
```

---

## 4. Development Workflow

### Local Development
```bash
# 1. Make changes
# 2. Test locally
npm run dev

# 3. Run tests
npm test

# 4. Commit changes
git add .
git commit -m "Your changes"
```

### Deployment
```bash
# 1. Push to trigger Vercel deployment
git push origin main

# 2. Verify deployment
curl https://your-app.vercel.app/health

# 3. Run migrations if schema changed
curl -X POST https://your-app.vercel.app/migrate
```

---

## 5. API Endpoints

### Authentication
- `POST /v1/auth/login` - User login
- `POST /v1/auth/logout` - User logout

### Admin (SuperAdmin only)
- `GET /v1/admin/tenants` - List all tenants
- `POST /v1/admin/tenants` - Create tenant

### Tenant APIs (Require x-tenant-id header)
- `GET /v1/users` - List users
- `GET /v1/stations` - List stations
- `GET /v1/pumps` - List pumps

### Utility
- `GET /health` - Health check
- `GET /schemas` - Debug database schemas
- `POST /migrate` - Run migrations and seeding

---

## 6. Default Credentials

### SuperAdmin (No tenant header required)
- Email: `admin@fuelsync.dev`
- Password: `password`

### Demo Tenant Users (Require `x-tenant-id: demo_tenant_001`)
- Owner: `owner@demo.com` / `password`
- Manager: `manager@demo.com` / `password`
- Attendant: `attendant@demo.com` / `password`

---

## 7. Environment Comparison

| Feature | Local | Vercel |
|---------|-------|--------|
| Database | Azure PostgreSQL | Neon PostgreSQL |
| Environment | .env.development | Vercel Dashboard |
| URL | localhost:3001 | your-app.vercel.app |
| CORS | Not needed | Required |
| Migrations | npm scripts | HTTP endpoints |

---

## 8. Next Steps

1. **Complete local setup** and verify all endpoints work
2. **Deploy to Vercel** with Neon database
3. **Test production** endpoints
4. **Set up CI/CD** for automated deployments
5. **Add monitoring** and error tracking
6. **Implement proper logging** for production debugging

---

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Verify environment variables
3. Test database connectivity
4. Check Vercel deployment logs
5. Consider alternative deployment platforms if CORS issues persist