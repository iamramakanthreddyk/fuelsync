import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface TenantInput {
  name: string;
  planId: string;
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
 * Create a new tenant with its own schema
 */
export async function createTenant(db: Pool, input: TenantInput): Promise<TenantOutput> {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Generate schema name (lowercase, no spaces)
    const schemaName = `tenant_${input.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-6)}`;
    
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
    
    // Create owner user for tenant
    const adminHash = await import('bcrypt').then(bcrypt => bcrypt.hash('tenant123', 10));
    
    const ownerResult = await client.query(
      `INSERT INTO ${schemaName}.users (tenant_id, email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenant.id, `owner@${schemaName}.com`, adminHash, `${input.name} Owner`, 'owner']
    );
    
    await client.query('COMMIT');
    
    return {
      id: tenant.id,
      name: tenant.name,
      schemaName: tenant.schema_name,
      planId: tenant.plan_id,
      status: tenant.status,
      createdAt: tenant.created_at
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
export async function listTenants(db: Pool): Promise<TenantOutput[]> {
  const result = await db.query(
    `SELECT t.id, t.name, t.schema_name, t.plan_id, t.status, t.created_at, p.name as plan_name
     FROM public.tenants t
     LEFT JOIN public.plans p ON t.plan_id = p.id
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
 * Get tenant by ID
 */
export async function getTenant(db: Pool, id: string): Promise<TenantOutput | null> {
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
  return {
    id: row.id,
    name: row.name,
    schemaName: row.schema_name,
    planId: row.plan_id,
    planName: row.plan_name,
    status: row.status,
    createdAt: row.created_at
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
 * Delete tenant and its schema
 */
export async function deleteTenant(db: Pool, id: string): Promise<void> {
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
    
    // Drop schema
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