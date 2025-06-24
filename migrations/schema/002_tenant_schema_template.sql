-- Migration: 002_tenant_schema_template
-- Description: Tenant schema template for per-tenant tables
-- Version: 1.0.0
-- Dependencies: 001_initial_schema

-- =====================================================
-- TENANT SCHEMA TEMPLATE
-- =====================================================
-- Replace {{schema_name}} with actual tenant schema name

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