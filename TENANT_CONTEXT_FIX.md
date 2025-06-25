# Tenant Context Fix Documentation

## Issue Summary

**Problem**: Tenant users (owners, managers, attendants) were unable to perform CRUD operations on stations, pumps, and readings due to missing tenant context.

**Root Cause**: Controllers were only checking `req.user?.tenantId` from JWT payload, but tenant users don't have `tenantId` in their JWT tokens. The tenant context comes from the `x-tenant-id` header sent by the frontend.

## Authentication Flow

### Super Admin Users
- Stored in: `public.admin_users` table
- JWT payload: `{ userId, role: 'superadmin', tenantId: null }`
- Tenant context: Via `x-tenant-id` header when accessing tenant-specific data
- No tenant header for admin routes (`/admin/*`)

### Tenant Users (Owner, Manager, Attendant)
- Stored in: `{tenant_schema}.users` table
- JWT payload: `{ userId, role, tenantId }`
- Tenant context: Via `x-tenant-id` header sent by frontend
- Always need tenant context for operations

## Fixed Controllers

### 1. Station Controller (`src/controllers/station.controller.ts`)
**Operations Fixed:**
- Create station
- List stations
- Update station
- Delete station
- Get station metrics
- Get station performance
- Compare stations
- Station ranking

**Fix Applied:**
```typescript
// Before
const tenantId = req.user?.tenantId;

// After
const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] as string;
```

### 2. Pump Controller (`src/controllers/pump.controller.ts`)
**Operations Fixed:**
- Create pump
- List pumps
- Delete pump

**Fix Applied:**
```typescript
// Before
const tenantId = req.user?.tenantId;

// After
const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] as string;
```

### 3. Tenant Management Routes
**Added Missing Routes:**
- `PATCH /admin/tenants/:id/status` - Update tenant status
- `DELETE /admin/tenants/:id` - Delete tenant

**Added Missing Handlers:**
- `updateStatus` - Updates tenant status (active/suspended/cancelled)
- `delete` - Deletes tenant and its schema

## Frontend Client Fix

**File:** `src/api/client.ts`

**Issue:** Frontend was sending `x-tenant-id` header even for login requests, causing super admin login to fail.

**Fix:** Modified header logic:
```typescript
// For superadmin users
if (userData.role === 'superadmin') {
  // Don't send tenant header for admin routes or login
  if (!config.url?.includes('/admin/') && !config.url?.includes('/auth/login')) {
    // For non-admin routes, superadmin needs a tenant context
    config.headers['x-tenant-id'] = userData.tenantId || 'production_tenant';
  }
} else {
  // For regular tenant users, always send their tenant ID (except login)
  if (userData.tenantId && !config.url?.includes('/auth/login')) {
    config.headers['x-tenant-id'] = userData.tenantId;
  }
}
```

## Database Structure

### Tenant Schema Structure
Each tenant has its own schema with tables:
- `users` - Tenant users (owner, manager, attendant)
- `stations` - Fuel stations
- `pumps` - Fuel pumps
- `nozzles` - Pump nozzles
- `sales` - Sales transactions
- `fuel_inventory` - Fuel stock levels
- `creditors` - Credit customers
- `alerts` - System alerts

### User Credentials
**Super Admin:**
- `admin@fuelsync.com` / `admin123`
- `admin2@fuelsync.com` / `admin123`
- `support@fuelsync.com` / `admin123`

**Production Tenant:**
- `owner@production-tenant.com` / `admin123`
- `manager@production-tenant.com` / `admin123`
- `attendant@production-tenant.com` / `admin123`

## Testing

### 1. Super Admin Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fuelsync.com","password":"admin123"}'
```

### 2. Tenant Owner Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@production-tenant.com","password":"admin123"}'
```

### 3. Owner Create Station
```bash
curl -X POST http://localhost:3000/api/v1/stations \
  -H "Authorization: Bearer <owner_token>" \
  -H "x-tenant-id: production_tenant" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Station","address":"123 Main St"}'
```

### 4. Super Admin Update Tenant Status
```bash
curl -X PATCH http://localhost:3000/api/v1/admin/tenants/<tenant_id>/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"suspended"}'
```

## Key Points

1. **Tenant Context Priority**: Controllers now check JWT token first, then fall back to header
2. **Super Admin Flexibility**: Can access any tenant's data by setting appropriate header
3. **Tenant User Isolation**: Always operate within their tenant's schema
4. **Login Flow**: No tenant header sent during login to allow proper user type detection
5. **Admin Routes**: Super admins don't send tenant headers for admin operations

## Files Modified

1. `src/controllers/station.controller.ts` - Fixed tenant context retrieval
2. `src/controllers/pump.controller.ts` - Fixed tenant context retrieval  
3. `src/routes/adminTenant.route.ts` - Added missing routes
4. `src/controllers/tenant.controller.ts` - Added missing handlers
5. `src/api/client.ts` (frontend) - Fixed header logic
6. `src/services/inventory.service.ts` - Fixed null check

## Next Steps

1. Apply similar fixes to other controllers (nozzles, readings, sales, etc.)
2. Test all CRUD operations for each user role
3. Verify tenant isolation is maintained
4. Add integration tests for multi-tenant scenarios