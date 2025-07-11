# SuperAdmin User Management Issue Fix

## Problem Description

The SuperAdmin dashboard shows data (4 tenants, 2 admin users, 3 plans) but other pages like user management show nothing.

## Root Cause

There are **two separate user management systems** in the application:

1. **SuperAdmin System** - manages `admin_users` table (global, no tenant_id)
2. **Tenant User System** - manages `users` table (tenant-specific, with tenant_id)

When a SuperAdmin logs in, they get a JWT token with `tenantId: null`. The SuperAdmin dashboard works because it queries global tables, but user management fails because it tries to access tenant-specific users.

## Database Schema

### SuperAdmin Users (`public.admin_users`)
- Global users with roles like 'superadmin'
- No tenant_id constraint
- Managed via `/api/v1/admin/users` endpoints

### Tenant Users (`public.users`)
- Tenant-specific users with roles like 'owner', 'manager', 'attendant'
- Required tenant_id foreign key
- Managed via `/api/v1/users` endpoints

## API Endpoints

### SuperAdmin User Management
```
GET    /api/v1/admin/users           - List admin users
POST   /api/v1/admin/users           - Create admin user
GET    /api/v1/admin/users/:id       - Get admin user
PUT    /api/v1/admin/users/:id       - Update admin user
DELETE /api/v1/admin/users/:id       - Delete admin user
POST   /api/v1/admin/users/:id/reset-password - Reset admin password
```

### Tenant User Management (requires tenant context)
```
GET    /api/v1/users                 - List tenant users
POST   /api/v1/users                 - Create tenant user
GET    /api/v1/users/:id             - Get tenant user
PUT    /api/v1/users/:id             - Update tenant user
DELETE /api/v1/users/:id             - Delete tenant user
```

## Solution

The frontend needs to use the correct endpoints based on the user's role:

1. **For SuperAdmin users**: Use `/api/v1/admin/users` endpoints
2. **For Tenant users**: Use `/api/v1/users` endpoints with proper tenant context

## Frontend Fix Required

The frontend should:

1. Check the user's role from the JWT token
2. If role is 'superadmin', use admin user management endpoints
3. If role is 'owner'/'manager'/'attendant', use tenant user management endpoints

## Authentication Context

### SuperAdmin Token Payload
```json
{
  "userId": "uuid",
  "role": "superadmin",
  "tenantId": null
}
```

### Tenant User Token Payload
```json
{
  "userId": "uuid", 
  "role": "owner|manager|attendant",
  "tenantId": "tenant-uuid"
}
```

## Testing the Fix

1. Login as SuperAdmin
2. Access user management - should show admin users from `/api/v1/admin/users`
3. Login as Tenant Owner
4. Access user management - should show tenant users from `/api/v1/users`

## Current Status

- Backend API endpoints are correctly implemented
- Database schema is properly structured
- Issue is in frontend routing/endpoint selection
- SuperAdmin dashboard works correctly (shows global data)
- User management needs frontend fix to use correct endpoints