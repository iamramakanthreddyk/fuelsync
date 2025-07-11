# Dashboard Issue Solution

## Problem Summary

**Issue**: SuperAdmin dashboard shows data (4 tenants, 2 admin users, 3 plans) but user management pages show nothing.

## Root Cause Analysis

The application has **two separate user management systems**:

### 1. SuperAdmin System (Global)
- **Table**: `public.admin_users`
- **Endpoints**: `/api/v1/admin/users`
- **Token**: `{ userId, role: "superadmin", tenantId: null }`
- **Purpose**: Manage platform administrators

### 2. Tenant User System (Tenant-specific)
- **Table**: `public.users` 
- **Endpoints**: `/api/v1/users`
- **Token**: `{ userId, role: "owner|manager|attendant", tenantId: "uuid" }`
- **Purpose**: Manage users within each tenant

## Why Dashboard Works But User Management Doesn't

1. **Dashboard queries global tables** (`tenants`, `plans`, `admin_users`) ✅
2. **User management tries to query tenant-specific tables** with `tenantId: null` ❌

## Solution

The frontend needs to route to different endpoints based on user role:

### For SuperAdmin Users
```javascript
// Check if user is SuperAdmin
if (user.role === 'superadmin') {
  // Use admin endpoints
  const users = await fetch('/api/v1/admin/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
}
```

### For Tenant Users  
```javascript
// Check if user has tenant context
if (user.tenantId && user.role !== 'superadmin') {
  // Use tenant endpoints
  const users = await fetch('/api/v1/users', {
    headers: { 
      Authorization: `Bearer ${token}`,
      'x-tenant-id': user.tenantId 
    }
  });
}
```

## API Endpoint Reference

### SuperAdmin Endpoints (No tenant context required)
```
GET    /api/v1/admin/dashboard          - Dashboard metrics
GET    /api/v1/admin/users              - List admin users  
POST   /api/v1/admin/users              - Create admin user
GET    /api/v1/admin/tenants            - List all tenants
POST   /api/v1/admin/tenants            - Create tenant
GET    /api/v1/admin/plans              - List all plans
```

### Tenant Endpoints (Requires tenant context)
```
GET    /api/v1/users                    - List tenant users
POST   /api/v1/users                    - Create tenant user
GET    /api/v1/dashboard                - Tenant dashboard
GET    /api/v1/stations                 - List tenant stations
```

## Authentication Flow

### SuperAdmin Login
```javascript
POST /api/v1/admin/auth/login
{
  "email": "admin@example.com",
  "password": "password"
}

// Returns token with tenantId: null
```

### Tenant User Login
```javascript  
POST /api/v1/auth/login
{
  "email": "user@example.com", 
  "password": "password",
  "tenantId": "tenant-uuid"
}

// Returns token with tenantId: "tenant-uuid"
```

## Frontend Fix Implementation

### 1. Update User Management Component
```javascript
const UserManagement = () => {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    const fetchUsers = async () => {
      let endpoint, headers;
      
      if (user.role === 'superadmin') {
        // SuperAdmin - fetch admin users
        endpoint = '/api/v1/admin/users';
        headers = { Authorization: `Bearer ${token}` };
      } else {
        // Tenant user - fetch tenant users  
        endpoint = '/api/v1/users';
        headers = { 
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user.tenantId 
        };
      }
      
      const response = await fetch(endpoint, { headers });
      const data = await response.json();
      setUsers(data.data.users || data.data);
    };
    
    fetchUsers();
  }, [user, token]);
  
  return (
    <div>
      <h2>{user.role === 'superadmin' ? 'Admin Users' : 'Tenant Users'}</h2>
      {users.map(user => (
        <div key={user.id}>{user.email} - {user.role}</div>
      ))}
    </div>
  );
};
```

### 2. Update Navigation Logic
```javascript
const Navigation = () => {
  const { user } = useAuth();
  
  return (
    <nav>
      {user.role === 'superadmin' ? (
        // SuperAdmin navigation
        <>
          <Link to="/admin/dashboard">Dashboard</Link>
          <Link to="/admin/users">Admin Users</Link>
          <Link to="/admin/tenants">Tenants</Link>
          <Link to="/admin/plans">Plans</Link>
        </>
      ) : (
        // Tenant user navigation
        <>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/users">Users</Link>
          <Link to="/stations">Stations</Link>
        </>
      )}
    </nav>
  );
};
```

## Testing the Fix

1. **Start the server**: `npm run dev`
2. **Test SuperAdmin endpoints**: Use `/api/v1/admin/*` routes
3. **Test Tenant endpoints**: Use `/api/v1/*` routes with tenant context
4. **Verify user management shows correct data for each user type**

## Database Verification

Check if data exists in both tables:

```sql
-- Check admin users (SuperAdmin system)
SELECT COUNT(*) FROM public.admin_users;

-- Check tenant users (Tenant system)  
SELECT COUNT(*) FROM public.users;

-- Check tenants
SELECT COUNT(*) FROM public.tenants;

-- Check plans
SELECT COUNT(*) FROM public.plans;
```

## Status

- ✅ Backend API endpoints are correctly implemented
- ✅ Database schema is properly structured  
- ✅ Authentication system works for both user types
- ❌ Frontend needs to route to correct endpoints based on user role

The fix requires **frontend changes only** - no backend modifications needed.