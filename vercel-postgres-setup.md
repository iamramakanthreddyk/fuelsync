# Vercel Postgres Setup

## 1. Add Vercel Postgres
```bash
npm install @vercel/postgres
```

## 2. In Vercel Dashboard:
- Go to your project
- Storage tab → Create Database → Postgres
- This auto-sets environment variables

## 3. Auto-seed on deployment
Add to package.json:
```json
"scripts": {
  "vercel-build": "npm run build && npm run migrate:vercel && npm run seed:vercel"
}
```