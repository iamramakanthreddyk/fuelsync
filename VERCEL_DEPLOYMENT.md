# Vercel Deployment Guide

## Prerequisites
1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`

## Environment Variables
Set these environment variables in your Vercel dashboard:

```
NODE_ENV=production
DB_HOST=your-database-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRATION=1h
```

## Deployment Steps

1. **Build the project locally (optional)**:
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

3. **Update CORS origins** in `src/app.ts` with your actual Vercel domain

## Files Created for Vercel:
- `vercel.json` - Vercel configuration
- `api/index.ts` - Serverless function entry point
- `.vercelignore` - Files to exclude from deployment
- `.env.example` - Environment variables template

## Important Notes:
- Database must be accessible from Vercel (consider using services like Supabase, PlanetScale, or Neon)
- All production dependencies are moved to `dependencies` section in package.json
- The app is configured as a serverless function with 30-second timeout
- CORS is configured to allow Vercel domains

## Testing:
After deployment, test your API endpoints:
- `https://your-app.vercel.app/v1/auth/login`
- `https://your-app.vercel.app/api/docs`

## Troubleshooting:
- Check Vercel function logs for errors
- Ensure database connection strings are correct
- Verify all environment variables are set in Vercel dashboard