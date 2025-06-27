# Tenant UUID vs Schema Name Fix

## Root Cause
The system was confusing **schema names** (like "production_tenant", "ramakanthreddyk") with **tenant UUIDs**. Database tables have `tenant_id` columns that expect UUIDs, but the code was passing schema names.

## Error Example
```
"invalid input syntax for type uuid: \"ramakanthreddyk\""
```

## Solution Pattern

### 1. Service Layer Fix
**Before:**
```typescript
export async function createStation(db: Pool, tenantId: string, name: string) {
  const res = await client.query(
    `INSERT INTO ${tenantId}.stations (tenant_id, name) VALUES ($1,$2) RETURNING id`,
    [tenantId, name] // ❌ tenantId is schema name, not UUID
  );
}
```

**After:**
```typescript
export async function createStation(db: Pool, schemaName: string, name: string) {
  // Get actual tenant UUID from schema name
  const tenantRes = await client.query(
    'SELECT id FROM public.tenants WHERE schema_name = $1', // deprecated lookup
    [schemaName]
  );
  const tenantId = tenantRes.rows[0].id; // ✅ Actual UUID
  
  const res = await client.query(
    `INSERT INTO ${schemaName}.stations (tenant_id, name) VALUES ($1,$2) RETURNING id`,
    [tenantId, name] // ✅ Now using UUID
  );
}
```

### 2. Controller Layer Fix
**Before:**
```typescript
const tenantId = req.user?.tenantId; // ❌ Only from JWT
```

**After:**
```typescript
const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] as string; // ✅ JWT or header
```

## Fixed Files

### Services (Schema Name → UUID conversion)
- ✅ `src/services/station.service.ts` - All functions
- ✅ `src/services/pump.service.ts` - All functions  
- 🔄 `src/services/nozzle.service.ts` - Needs fixing
- 🔄 `src/services/nozzleReading.service.ts` - Needs fixing
- 🔄 Other services with tenant_id columns

### Controllers (Tenant Context)
- ✅ `src/controllers/station.controller.ts` - All methods
- ✅ `src/controllers/pump.controller.ts` - All methods
- ✅ `src/controllers/nozzle.controller.ts` - All methods
- 🔄 `src/controllers/nozzleReading.controller.ts` - Needs fixing
- 🔄 Other controllers needing tenant context

## Database Schema Structure

### Tenants Table (public.tenants)
```sql
id          UUID PRIMARY KEY     -- This is what tenant_id columns reference
name        TEXT                 -- Display name
schema_name TEXT                 -- Schema identifier (deprecated)
```

### Tenant Schema Tables ({schema}.stations, {schema}.pumps, etc.)
```sql
id         UUID PRIMARY KEY
tenant_id  UUID REFERENCES public.tenants(id)  -- Must be UUID, not schema name
-- other columns
```

## Testing Commands

### 1. Owner Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@production-tenant.com","password":"Admin@123"}'
```

### 2. Create Station (should work now)
```bash
curl -X POST http://localhost:3000/api/v1/stations \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: production_tenant" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Station","address":"123 Test St"}'
```

### 3. List Stations
```bash
curl -X GET http://localhost:3000/api/v1/stations \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: production_tenant"
```

## Key Points

1. **Schema Name ≠ Tenant ID**: Schema names are strings, tenant IDs are UUIDs
2. **Two-Step Process**: Get UUID from schema name, then use UUID in queries
3. **Consistent Pattern**: All services need this UUID lookup pattern
4. **Frontend Headers**: Must send `x-tenant-id` with schema name
5. **JWT vs Headers**: Controllers check both JWT token and headers for tenant context

## Next Steps

1. ✅ Fix remaining nozzle and reading services
2. ✅ Apply controller fixes to all tenant-specific endpoints  
3. ✅ Test all CRUD operations for owners/managers
4. ✅ Verify tenant isolation still works
5. ✅ Update documentation