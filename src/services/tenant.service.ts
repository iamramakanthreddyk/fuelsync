import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface TenantInput {
  name: string;
  planId: string;
  schemaName?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPassword?: string;
}

export interface TenantCreationResult {
  tenant: TenantOutput;
  owner: {
    id: string;
    email: string;
    password: string; // Plain text for initial communication
    name: string;
  };
}

export interface TenantOutput {
  id: string;
  name: string;
  schemaName: string;
  planId: string;
  planName?: string;
  status: string;
  createdAt: Date;
}

/**
 * Generate secure password based on tenant name and schema
 */
function generatePassword(tenantName: string, schemaName: string): string {
  const firstName = tenantName.split(' ')[0].toLowerCase();
  const schemaPrefix = schemaName.split('_')[0] || 'tenant';
  return `${firstName}@${schemaPrefix}123`;
}

/**
 * Create a new tenant with its own schema and owner user
 */
export async function createTenant(db: Pool, input: TenantInput): Promise<TenantCreationResult> {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Use provided schema name or generate one
    let schemaName = input.schemaName;
    
    if (!schemaName) {
      const baseName = `tenant_${input.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      schemaName = `${baseName}_${Date.now().toString().slice(-6)}`;
    }
    
    // Check if schema name already exists
    const existingSchema = await client.query(
      'SELECT id FROM public.tenants WHERE schema_name = $1',
      [schemaName]
    );
    
    if (existingSchema.rows.length > 0) {
      throw new Error(`Schema name '${schemaName}' already exists`);
    }
    
    // Create tenant record
    const result = await client.query(
      'INSERT INTO public.tenants (name, schema_name, plan_id, status) VALUES ($1, $2, $3, $4) RETURNING id, name, schema_name, plan_id, status, created_at',
      [input.name, schemaName, input.planId, 'active']
    );
    
    const tenant = result.rows[0];
    
    // Create schema for tenant
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    // Load tenant schema template
    const templatePath = path.join(__dirname, '../../migrations/schema/002_tenant_schema_template.sql');
    let templateSql = '';
    
    try {
      templateSql = fs.readFileSync(templatePath, 'utf8');
    } catch (err) {
      // Fallback to hardcoded schema if file not found
      templateSql = getTenantSchemaTemplate();
    }
    
    // Replace placeholder with actual schema name
    const schemaSql = templateSql.replace(/\{\{schema_name\}\}/g, schemaName);
    
    // Create tenant tables
    await client.query(schemaSql);
    
    // Generate owner credentials
    const ownerName = input.ownerName || `${input.name} Owner`;
    const emailDomain = schemaName.replace(/_/g, '-');
    const ownerEmail = input.ownerEmail || `owner@${emailDomain}.com`;
    const rawPassword = input.ownerPassword || generatePassword(input.name, schemaName);
    const passwordHash = await import('bcrypt').then(bcrypt => bcrypt.hash(rawPassword, 10));

    // Create owner user
    const ownerResult = await client.query(
      `INSERT INTO ${schemaName}.users (tenant_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenant.id, ownerEmail, passwordHash, ownerName, 'owner']
    );
    
    const ownerId = ownerResult.rows[0].id;
    
    // Create default manager and attendant users
    const managerEmail = `manager@${emailDomain}.com`;
    const managerPassword = generatePassword(`${input.name} Manager`, schemaName);
    const managerHash = await import('bcrypt').then(bcrypt => bcrypt.hash(managerPassword, 10));
    
    await client.query(
      `INSERT INTO ${schemaName}.users (tenant_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenant.id, managerEmail, managerHash, `${input.name} Manager`, 'manager']
    );
    
    const attendantEmail = `attendant@${emailDomain}.com`;
    const attendantPassword = generatePassword(`${input.name} Attendant`, schemaName);
    const attendantHash = await import('bcrypt').then(bcrypt => bcrypt.hash(attendantPassword, 10));
    
    await client.query(
      `INSERT INTO ${schemaName}.users (tenant_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenant.id, attendantEmail, attendantHash, `${input.name} Attendant`, 'attendant']
    );
    
    await client.query('COMMIT');
    
    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        schemaName: tenant.schema_name,
        planId: tenant.plan_id,
        status: tenant.status,
        createdAt: tenant.created_at
      },
      owner: {
        id: ownerId,
        email: ownerEmail,
        password: rawPassword,
        name: ownerName
      }
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tenant:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * List all tenants
 */
export async function listTenants(db: Pool, includeDeleted = false): Promise<TenantOutput[]> {
  const whereClause = includeDeleted ? '' : "WHERE t.status != 'deleted'";
  const result = await db.query(
    `SELECT t.id, t.name, t.schema_name, t.plan_id, t.status, t.created_at, p.name as plan_name
     FROM public.tenants t
     LEFT JOIN public.plans p ON t.plan_id = p.id
     ${whereClause}
     ORDER BY t.created_at DESC`
  );
  
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    schemaName: row.schema_name,
    planId: row.plan_id,
    planName: row.plan_name,
    status: row.status,
    createdAt: row.created_at
  }));
}

/**
 * Get tenant by ID with detailed information
 */
export async function getTenant(db: Pool, id: string): Promise<any | null> {
  const result = await db.query(
    `SELECT t.id, t.name, t.schema_name, t.plan_id, t.status, t.created_at, p.name as plan_name
     FROM public.tenants t
     LEFT JOIN public.plans p ON t.plan_id = p.id
     WHERE t.id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  const schemaName = row.schema_name;
  
  // Get users
  const usersResult = await db.query(
    `SELECT id, email, name, role, created_at FROM ${schemaName}.users ORDER BY 
     CASE role WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 WHEN 'attendant' THEN 3 END`
  );
  
  // Get stations with hierarchy
  const stationsResult = await db.query(
    `SELECT s.id, s.name, s.address, s.status,
     (SELECT COUNT(*) FROM ${schemaName}.pumps p WHERE p.station_id = s.id) as pump_count
     FROM ${schemaName}.stations s ORDER BY s.name`
  );
  
  const stations = [];
  for (const station of stationsResult.rows) {
    const pumpsResult = await db.query(
      `SELECT p.id, p.label, p.serial_number, p.status,
       (SELECT COUNT(*) FROM ${schemaName}.nozzles n WHERE n.pump_id = p.id) as nozzle_count
       FROM ${schemaName}.pumps p WHERE p.station_id = $1 ORDER BY p.label`,
      [station.id]
    );
    
    const pumps = [];
    for (const pump of pumpsResult.rows) {
      const nozzlesResult = await db.query(
        `SELECT id, nozzle_number, fuel_type, status FROM ${schemaName}.nozzles 
         WHERE pump_id = $1 ORDER BY nozzle_number`,
        [pump.id]
      );
      
      pumps.push({
        ...pump,
        nozzles: nozzlesResult.rows
      });
    }
    
    stations.push({
      ...station,
      pumps
    });
  }
  
  return {
    id: row.id,
    name: row.name,
    schemaName: row.schema_name,
    planId: row.plan_id,
    planName: row.plan_name,
    status: row.status,
    createdAt: row.created_at,
    users: usersResult.rows,
    stations,
    userCount: usersResult.rows.length,
    stationCount: stations.length
  };
}

/**
 * Create additional user for existing tenant
 */
export async function createTenantUser(db: Pool, tenantId: string, userData: {
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'attendant';
  password?: string;
}): Promise<{ id: string; email: string; password: string }> {
  // Get tenant info
  const tenantResult = await db.query(
    'SELECT name, schema_name FROM public.tenants WHERE id = $1',
    [tenantId]
  );
  
  if (tenantResult.rows.length === 0) {
    throw new Error('Tenant not found');
  }
  
  const { name: tenantName, schema_name: schemaName } = tenantResult.rows[0];
  
  // Generate password if not provided
  const rawPassword = userData.password || generatePassword(userData.name, schemaName);
  const passwordHash = await import('bcrypt').then(bcrypt => bcrypt.hash(rawPassword, 10));
  
  // Create user
  const userResult = await db.query(
    `INSERT INTO ${schemaName}.users (tenant_id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [tenantId, userData.email, passwordHash, userData.name, userData.role]
  );
  
  return {
    id: userResult.rows[0].id,
    email: userData.email,
    password: rawPassword
  };
}

/**
 * Update tenant status
 */
export async function updateTenantStatus(db: Pool, id: string, status: string): Promise<void> {
  await db.query(
    'UPDATE public.tenants SET status = $1 WHERE id = $2',
    [status, id]
  );
}

/**
 * Soft delete tenant (set status to 'deleted' instead of destroying data)
 */
export async function deleteTenant(db: Pool, id: string): Promise<void> {
  // Soft delete - just mark as deleted instead of destroying all data
  await db.query(
    'UPDATE public.tenants SET status = $1, deleted_at = NOW() WHERE id = $2',
    ['deleted', id]
  );
}

/**
 * DANGEROUS: Permanently delete tenant and all data (admin only)
 * This should only be used in extreme cases with explicit confirmation
 */
export async function permanentlyDeleteTenant(db: Pool, id: string): Promise<void> {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get schema name
    const result = await client.query(
      'SELECT schema_name FROM public.tenants WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Tenant not found');
    }
    
    const schemaName = result.rows[0].schema_name;
    
    // Drop schema - THIS DESTROYS ALL DATA
    await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    
    // Delete tenant record
    await client.query('DELETE FROM public.tenants WHERE id = $1', [id]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get tenant schema template as a fallback
 */
function getTenantSchemaTemplate(): string {
  return `
    -- Tenant users
    CREATE TABLE {{schema_name}}.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'attendant')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Fuel stations
    CREATE TABLE {{schema_name}}.stations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Fuel pumps
    CREATE TABLE {{schema_name}}.pumps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      station_id UUID NOT NULL REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      serial_number VARCHAR(100),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Pump nozzles
    CREATE TABLE {{schema_name}}.nozzles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      pump_id UUID NOT NULL REFERENCES {{schema_name}}.pumps(id) ON DELETE CASCADE,
      nozzle_number INTEGER NOT NULL,
      fuel_type TEXT NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'premium')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Fuel pricing history
    CREATE TABLE {{schema_name}}.fuel_prices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      station_id UUID NOT NULL REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE,
      fuel_type TEXT NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'premium')),
      price DECIMAL(10,2) NOT NULL CHECK (price > 0),
      cost_price DECIMAL(10,2) DEFAULT 0,
      valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Credit customers
    CREATE TABLE {{schema_name}}.creditors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      station_id UUID REFERENCES {{schema_name}}.stations(id),
      party_name TEXT NOT NULL,
      contact_number TEXT,
      address TEXT,
      credit_limit DECIMAL(10,2) DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Nozzle meter readings
    CREATE TABLE {{schema_name}}.nozzle_readings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      nozzle_id UUID NOT NULL REFERENCES {{schema_name}}.nozzles(id) ON DELETE CASCADE,
      station_id UUID NOT NULL REFERENCES {{schema_name}}.stations(id),
      reading DECIMAL(10,3) NOT NULL CHECK (reading >= 0),
      recorded_at TIMESTAMPTZ NOT NULL,
      payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'upi', 'credit')),
      creditor_id UUID REFERENCES {{schema_name}}.creditors(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Sales transactions
    CREATE TABLE {{schema_name}}.sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      nozzle_id UUID NOT NULL REFERENCES {{schema_name}}.nozzles(id),
      station_id UUID NOT NULL REFERENCES {{schema_name}}.stations(id),
      volume DECIMAL(10,3) NOT NULL CHECK (volume >= 0),
      fuel_type TEXT NOT NULL,
      fuel_price DECIMAL(10,2) NOT NULL,
      cost_price DECIMAL(10,2) DEFAULT 0,
      amount DECIMAL(10,2) NOT NULL,
      profit DECIMAL(10,2) DEFAULT 0,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'credit')),
      creditor_id UUID REFERENCES {{schema_name}}.creditors(id),
      created_by UUID REFERENCES {{schema_name}}.users(id),
      status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted')),
      recorded_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Credit payments
    CREATE TABLE {{schema_name}}.credit_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      creditor_id UUID NOT NULL REFERENCES {{schema_name}}.creditors(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'check')),
      reference_number TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Fuel inventory
    CREATE TABLE {{schema_name}}.fuel_inventory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      station_id UUID NOT NULL REFERENCES {{schema_name}}.stations(id),
      fuel_type TEXT NOT NULL,
      current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
      minimum_level DECIMAL(10,3) NOT NULL DEFAULT 1000,
      last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- System alerts
    CREATE TABLE {{schema_name}}.alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      station_id UUID REFERENCES {{schema_name}}.stations(id),
      alert_type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Fuel deliveries
    CREATE TABLE {{schema_name}}.fuel_deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      station_id UUID NOT NULL REFERENCES {{schema_name}}.stations(id),
      fuel_type TEXT NOT NULL,
      volume DECIMAL(10,3) NOT NULL CHECK (volume > 0),
      delivered_by TEXT,
      delivery_date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}