# SuperAdmin User Access Fix

## Problem
SuperAdmin was getting 403 Forbidden when trying to access `/api/v1/users` endpoints because the routes only allowed Owner/Manager roles, not SuperAdmin.

## Solution Applied

### 1. Updated User Routes (`src/routes/user.route.ts`)
- Added `UserRole.SuperAdmin` to all route permissions
- Changed `requireOwnerOrManager` to `requireOwnerOrManagerOrSuperAdmin`
- Changed `requireOwner` to `requireOwnerOrSuperAdmin`

### 2. Updated User Controller (`src/controllers/user.controller.ts`)

#### List Users
- SuperAdmin can list all users across all tenants: `GET /api/v1/users`
- SuperAdmin can list users from specific tenant: `GET /api/v1/users?tenantId=uuid`
- Regular users still get their tenant-specific users

#### Get User by ID
- SuperAdmin can get any user by ID
- Regular users can only get users from their tenant

#### Create User
- SuperAdmin must specify `tenantId` in request body
- Regular users create users in their own tenant

#### Update User
- SuperAdmin can update any user
- Regular users can only update users in their tenant

#### Reset Password
- SuperAdmin can reset any user's password
- Regular users can only reset passwords in their tenant

#### Delete User
- SuperAdmin can delete any user (with owner protection per tenant)
- Regular users can only delete users in their tenant

## API Usage Examples

### SuperAdmin Access

```javascript
// List all users across all tenants
GET /api/v1/users
Authorization: Bearer <superadmin-token>

// List users from specific tenant
GET /api/v1/users?tenantId=tenant-uuid
Authorization: Bearer <superadmin-token>

// Create user in specific tenant
POST /api/v1/users
Authorization: Bearer <superadmin-token>
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "role": "manager",
  "tenantId": "tenant-uuid"
}

// Reset any user's password
POST /api/v1/users/user-uuid/reset-password
Authorization: Bearer <superadmin-token>
{
  "newPassword": "newpassword123"
}
```

### Regular User Access (unchanged)

```javascript
// List users in own tenant
GET /api/v1/users
Authorization: Bearer <tenant-user-token>
x-tenant-id: tenant-uuid

// Create user in own tenant
POST /api/v1/users
Authorization: Bearer <tenant-user-token>
x-tenant-id: tenant-uuid
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "role": "attendant"
}
```

## Security Considerations

1. **SuperAdmin Privileges**: SuperAdmin can access all tenant data
2. **Owner Protection**: Cannot delete the last owner of any tenant
3. **Tenant Isolation**: Regular users still restricted to their tenant
4. **Role Validation**: All role validations remain in place

## Testing

The fix allows SuperAdmin to:
- ✅ Access `/api/v1/users` (no more 403 Forbidden)
- ✅ List all users or users from specific tenant
- ✅ Create users in any tenant
- ✅ Update any user
- ✅ Reset any user's password
- ✅ Delete any user (with owner protection)

Regular tenant users continue to work as before with tenant isolation.

## Deployment

1. Build the project: `npm run build`
2. Deploy the updated code
3. SuperAdmin should now have full access to user management endpoints