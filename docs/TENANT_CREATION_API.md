# Tenant Creation API Guide

## API Endpoint

```
POST /api/v1/tenants
```

## Request Format

The API accepts the following formats:

### Format 1: Frontend Format
```json
{
  "name": "Tenant Name",
  "schema": "tenant_schema_name",
  "planType": "premium"
}
```

### Format 2: Backend Format
```json
{
  "name": "Tenant Name",
  "schemaName": "tenant_schema_name",
  "planId": "uuid-of-plan"
}
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | **Required**. The display name of the tenant |
| `schema` or `schemaName` | string | **Optional**. The schema name for the tenant's database schema. Must be lowercase letters, numbers, and underscores only. If not provided, it will be generated from the name. |
| `planType` or `planId` | string | **Required**. Either the plan type (`basic`, `pro`, `premium`) or the UUID of the plan |

## Response Format

```json
{
  "id": "uuid-of-tenant",
  "name": "Tenant Name",
  "schemaName": "tenant_schema_name",
  "status": "active"
}
```

## What Happens When a Tenant is Created

1. A new record is added to the `public.tenants` table
2. A new PostgreSQL schema is created with the specified schema name
3. All required tables are created in the new schema
4. An owner user is automatically created for the tenant with:
   - Email: `owner@tenant-schema-name.com` (note: underscores are replaced with hyphens)
   - Password: `tenant123`
   - Role: `owner`

## User Management After Tenant Creation

1. The owner should login with the automatically created credentials
2. The owner should change their password immediately
3. The owner can create additional users (managers and attendants)
4. Each user can change their own password
5. The owner can reset passwords for other users if needed

## Example

### Request
```json
{
  "name": "Acme Fuels",
  "schema": "acme_fuels",
  "planType": "premium"
}
```

### Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Acme Fuels",
  "schemaName": "acme_fuels",
  "status": "active"
}
```

## Error Handling

### Invalid Schema Name
```json
{
  "error": "Schema name must be lowercase letters, numbers, and underscores only"
}
```

### Invalid Plan
```json
{
  "error": "Invalid plan ID or type"
}
```

### Schema Already Exists
```json
{
  "error": "Schema name already exists"
}
```

## Frontend Implementation

```javascript
async function createTenant(tenantData) {
  try {
    const response = await fetch('/api/v1/tenants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: tenantData.name,
        schema: tenantData.schemaName,
        planType: tenantData.planType
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create tenant');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
}
```