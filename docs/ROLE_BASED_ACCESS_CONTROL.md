# Role-Based Access Control (RBAC) System

## Overview

The FuelSync Hub implements a comprehensive role-based access control system that combines:
- **Plan-based feature restrictions** (Starter, Pro, Enterprise)
- **Role-based permissions** (SuperAdmin, Owner, Manager, Attendant)
- **Action-level controls** (view, create, edit, delete, etc.)
- **Tenant isolation** for multi-tenant security

## Architecture

### Backend Components

```
src/config/
├── roleBasedAccess.ts          # Core RBAC configuration
├── planFeatures.ts             # Plan feature definitions
└── tenantIsolation.ts          # Tenant isolation middleware

src/middlewares/
├── roleBasedAccessMiddleware.ts # RBAC enforcement
├── caseConversionMiddleware.ts  # API response standardization
└── tenantContextMiddleware.ts   # Tenant context management

src/utils/
├── caseConverter.ts            # Snake/camel case conversion
├── successResponse.ts          # Standardized responses
└── errorResponse.ts            # Error handling
```

### Frontend Components

```
src/hooks/
└── useRoleBasedAccess.ts       # Permission checking hook

src/components/auth/
└── PermissionGate.tsx          # Conditional rendering components

src/__tests__/
└── roleBasedAccess.test.tsx    # Comprehensive test suite
```

## Plan Tiers and Features

### Starter Plan (Regular)
- **Target**: Small fuel stations, basic operations
- **Stations**: Up to 1 station
- **Users**: Up to 5 users
- **Features**: Basic station management, readings, sales tracking
- **Restrictions**: No reports, analytics, or creditor management

### Pro Plan (Premium)
- **Target**: Medium fuel stations, growing businesses
- **Stations**: Up to 5 stations
- **Users**: Up to 20 users
- **Features**: All Starter features + reports, basic analytics, creditor management
- **Advanced**: Report generation, data export, scheduled reports

### Enterprise Plan
- **Target**: Large fuel station chains, enterprise operations
- **Stations**: Unlimited
- **Users**: Unlimited
- **Features**: All Pro features + advanced analytics, custom reports
- **Enterprise**: Multi-location management, advanced insights, priority support

## User Roles and Permissions

### SuperAdmin
- **Scope**: System-wide access across all tenants
- **Purpose**: Platform administration and support
- **Access**: Full access to all features regardless of plan
- **Special**: Can view/edit any tenant's data for support purposes

### Owner
- **Scope**: Full access within their tenant
- **Purpose**: Business owner, complete control
- **Access**: All features available in their plan
- **Limitations**: Cannot delete stations in Starter plan

### Manager
- **Scope**: Operational management within tenant
- **Purpose**: Day-to-day operations management
- **Access**: Most features with some restrictions
- **Limitations**: Cannot delete users/stations, limited settings access

### Attendant
- **Scope**: Limited operational access
- **Purpose**: Fuel station attendant, data entry
- **Access**: Basic operations only
- **Limitations**: Cannot view other users' data, no administrative access

## Permission Matrix

### Feature Access by Plan and Role

| Feature | Starter |  |  | Pro |  |  | Enterprise |  |  |
|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|
|         | Owner | Manager | Attendant | Owner | Manager | Attendant | Owner | Manager | Attendant |
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Stations** |  |  |  |  |  |  |  |  |  |
| - View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Create | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| - Edit | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| - Delete | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Users** |  |  |  |  |  |  |  |  |  |
| - View | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| - Create | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| - Edit | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| - Delete | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Readings** |  |  |  |  |  |  |  |  |  |
| - View Own | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| - View All | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| - Create | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Edit | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Reports** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Analytics** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Creditors** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Implementation Guide

### Backend Implementation

#### 1. Role-Based Access Middleware

```typescript
// src/middlewares/roleBasedAccessMiddleware.ts
import { hasFeatureAccess } from '../config/roleBasedAccess';

export function requireFeatureAccess(feature: string, action: string = 'view') {
  return (req: Request, res: Response, next: NextFunction) => {
    const { user } = req;
    const planTier = getPlanTierFromName(user.planName);
    
    if (!hasFeatureAccess(planTier, user.role, feature, action)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: {
          feature,
          action,
          requiredPlan: getRequiredPlan(feature, action),
          currentPlan: planTier,
          currentRole: user.role
        }
      });
    }
    
    next();
  };
}
```

#### 2. Controller Integration

```typescript
// Example: stations.controller.ts
router.get('/stations', 
  authenticateJWT,
  setTenantContext,
  requireFeatureAccess('stations', 'view'),
  async (req, res) => {
    // Controller logic
  }
);

router.post('/stations',
  authenticateJWT,
  setTenantContext,
  requireFeatureAccess('stations', 'create'),
  async (req, res) => {
    // Controller logic
  }
);
```

#### 3. Database Query Filtering

```typescript
// Automatic tenant isolation and role-based filtering
export async function getStations(tenantId: string, userId: string, userRole: string) {
  let query = `
    SELECT s.*, COUNT(p.id) as pump_count
    FROM stations s
    LEFT JOIN pumps p ON s.id = p.station_id
    WHERE s.tenant_id = $1
  `;
  
  const params = [tenantId];
  
  // Attendants can only see stations they're assigned to
  if (userRole === 'attendant') {
    query += ` AND s.id IN (
      SELECT station_id FROM user_station_assignments 
      WHERE user_id = $2
    )`;
    params.push(userId);
  }
  
  query += ` GROUP BY s.id ORDER BY s.name`;
  
  const result = await pool.query(query, params);
  return transformDbResult(result.rows);
}
```

### Frontend Implementation

#### 1. Permission Hook Usage

```tsx
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';

function StationsPage() {
  const { canView, canCreate, canEdit, canDelete, getUpgradeMessage } = useRoleBasedAccess();

  if (!canView('stations')) {
    return <AccessDenied message={getUpgradeMessage('stations')} />;
  }

  return (
    <div>
      <StationsList />
      
      {canCreate('stations') && (
        <CreateStationButton />
      )}
      
      {canEdit('stations') && (
        <EditStationForm />
      )}
      
      {canDelete('stations') && (
        <DeleteStationButton />
      )}
    </div>
  );
}
```

#### 2. Permission Gates

```tsx
import { ViewGate, CreateGate, PlanGate } from '@/components/auth/PermissionGate';

function Navigation() {
  return (
    <nav>
      <ViewGate feature="dashboard">
        <NavLink to="/dashboard">Dashboard</NavLink>
      </ViewGate>
      
      <ViewGate feature="stations">
        <NavLink to="/stations">Stations</NavLink>
      </ViewGate>
      
      <PlanGate requiredPlan="pro" showUpgradePrompt>
        <NavLink to="/reports">Reports</NavLink>
      </PlanGate>
      
      <PlanGate requiredPlan="enterprise" showUpgradePrompt>
        <NavLink to="/analytics">Advanced Analytics</NavLink>
      </PlanGate>
    </nav>
  );
}
```

## Testing Strategy

### 1. Backend Tests

```javascript
// test_user_journeys.js - Comprehensive role testing
describe('Role-Based Access Control', () => {
  test('Owner can access all plan features', async () => {
    const permissions = await testUserPermissions('pro', 'owner');
    expect(permissions.reports.view).toBe(true);
    expect(permissions.analytics.view).toBe(true);
    expect(permissions.stations.delete).toBe(true);
  });

  test('Attendant has limited access', async () => {
    const permissions = await testUserPermissions('pro', 'attendant');
    expect(permissions.users.view).toBe(false);
    expect(permissions.reports.view).toBe(false);
    expect(permissions.stations.create).toBe(false);
  });

  test('Starter plan restricts premium features', async () => {
    const permissions = await testUserPermissions('starter', 'owner');
    expect(permissions.reports.view).toBe(false);
    expect(permissions.analytics.view).toBe(false);
    expect(permissions.creditors.view).toBe(false);
  });
});
```

### 2. Frontend Tests

```tsx
// roleBasedAccess.test.tsx
describe('Permission Gates', () => {
  test('shows upgrade prompt for restricted features', () => {
    mockUser({ role: 'owner', planName: 'Regular' });
    
    render(
      <ViewGate feature="reports" showUpgradePrompt>
        <div>Reports Content</div>
      </ViewGate>
    );
    
    expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument();
  });
});
```

## Security Considerations

### 1. Defense in Depth
- **Frontend**: UI-level access control for user experience
- **Backend**: API-level enforcement for security
- **Database**: Row-level security for data protection

### 2. Tenant Isolation
- All queries automatically filtered by tenant_id
- Cross-tenant access prevention
- Audit logging for access attempts

### 3. Role Validation
- JWT tokens include role and tenant information
- Server-side role validation on every request
- Role changes require re-authentication

## Monitoring and Auditing

### 1. Access Logging

```sql
-- Role access log table
CREATE TABLE role_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  feature VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  granted BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Metrics and Alerts

```typescript
// Monitor permission denials
export function logAccessAttempt(
  tenantId: string,
  userId: string,
  feature: string,
  action: string,
  granted: boolean,
  req: Request
) {
  // Log to database
  pool.query(`
    INSERT INTO role_access_log 
    (tenant_id, user_id, feature, action, granted, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [tenantId, userId, feature, action, granted, req.ip, req.get('User-Agent')]);
  
  // Alert on suspicious activity
  if (!granted) {
    console.warn(`Access denied: ${userId} tried ${action} on ${feature}`);
  }
}
```

## Troubleshooting

### Common Issues

1. **Permission denied unexpectedly**
   - Check user's plan and role in database
   - Verify JWT token contains correct information
   - Check if feature is available in user's plan

2. **Frontend shows features that backend denies**
   - Ensure frontend permission matrix matches backend
   - Check if user data is properly loaded
   - Verify case conversion is working correctly

3. **Cross-tenant data access**
   - Check tenant context middleware
   - Verify all queries include tenant_id filter
   - Review JWT token tenant information

### Debug Tools

```typescript
// Add to any controller for debugging
console.log('Permission check:', {
  user: req.user,
  feature: 'stations',
  action: 'create',
  hasAccess: hasFeatureAccess(planTier, role, 'stations', 'create')
});
```

## Migration and Deployment

### 1. Database Migration

```sql
-- Add role-based access tables
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  max_stations INTEGER,
  max_users INTEGER,
  price_monthly DECIMAL(10,2),
  features JSONB
);

-- Update existing tables
ALTER TABLE tenants ADD COLUMN plan_id UUID REFERENCES plans(id);
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'attendant';
```

### 2. Deployment Checklist

- [ ] Backend RBAC middleware deployed
- [ ] Frontend permission components updated
- [ ] Database migrations applied
- [ ] User roles assigned
- [ ] Plan features configured
- [ ] Tests passing
- [ ] Monitoring enabled

## API Endpoints and Access Control

### Authentication Required
All API endpoints require valid JWT authentication except:
- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration

### Endpoint Access Matrix

#### Dashboard Endpoints
```
GET /api/v1/dashboard
- All roles: ✅ (plan-dependent data)
- Returns role-appropriate dashboard data
```

#### Station Management
```
GET /api/v1/stations
- All roles: ✅ (filtered by role)
- Attendants: Only assigned stations

POST /api/v1/stations
- Starter: Owner ✅, Manager ❌, Attendant ❌
- Pro+: Owner ✅, Manager ✅, Attendant ❌

PUT /api/v1/stations/:id
- Starter: Owner ✅, Manager ✅, Attendant ❌
- Pro+: Owner ✅, Manager ✅, Attendant ❌

DELETE /api/v1/stations/:id
- Starter: All roles ❌
- Pro+: Owner ✅, Manager ❌, Attendant ❌
- Enterprise: Owner ✅, Manager ✅, Attendant ❌
```

#### User Management
```
GET /api/v1/users
- Owner ✅, Manager ✅, Attendant ❌

POST /api/v1/users
- Starter: Owner ✅, Manager ❌, Attendant ❌
- Pro+: Owner ✅, Manager ✅, Attendant ❌

PUT /api/v1/users/:id
- Starter: Owner ✅, Manager ❌, Attendant ❌
- Pro+: Owner ✅, Manager ✅, Attendant ❌

DELETE /api/v1/users/:id
- Starter: All roles ❌
- Pro+: Owner ✅, Manager ❌, Attendant ❌
- Enterprise: Owner ✅, Manager ✅, Attendant ❌
```

#### Reports (Pro+ Plans Only)
```
GET /api/v1/reports/*
- Starter: All roles ❌ (403 Forbidden)
- Pro+: Owner ✅, Manager ✅, Attendant ❌
- Enterprise: Owner ✅, Manager ✅, Attendant ✅

POST /api/v1/reports/generate
- Pro+: Owner ✅, Manager ✅, Attendant ❌
- Enterprise: Owner ✅, Manager ✅, Attendant ❌
```

#### Analytics (Pro+ Plans Only)
```
GET /api/v1/analytics/*
- Starter: All roles ❌ (403 Forbidden)
- Pro: Owner ✅, Manager ✅, Attendant ❌ (Basic analytics)
- Enterprise: Owner ✅, Manager ✅, Attendant ❌ (Advanced analytics)
```

#### Creditors (Pro+ Plans Only)
```
GET /api/v1/creditors
- Starter: All roles ❌ (403 Forbidden)
- Pro: Owner ✅, Manager ✅, Attendant ✅ (view only)
- Enterprise: Owner ✅, Manager ✅, Attendant ✅

POST /api/v1/creditors
- Pro: Owner ✅, Manager ✅, Attendant ❌
- Enterprise: Owner ✅, Manager ✅, Attendant ✅
```

### Error Responses

#### 403 Forbidden - Insufficient Permissions
```json
{
  "success": false,
  "message": "Access denied",
  "error": {
    "feature": "reports",
    "action": "view",
    "requiredPlan": "pro",
    "currentPlan": "starter",
    "currentRole": "owner",
    "upgradeMessage": "Upgrade to Pro or Enterprise to access this feature"
  }
}
```

#### 403 Forbidden - Role Restriction
```json
{
  "success": false,
  "message": "Insufficient role permissions",
  "error": {
    "feature": "users",
    "action": "delete",
    "requiredRole": ["owner", "superadmin"],
    "currentRole": "manager"
  }
}
```

This comprehensive RBAC system provides secure, scalable access control that grows with your business needs while maintaining excellent user experience.
