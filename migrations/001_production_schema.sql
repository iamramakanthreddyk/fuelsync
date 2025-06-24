-- Production Database Schema
-- Single migration for complete FuelSync database

-- Drop ALL existing schemas and start fresh
DROP SCHEMA IF EXISTS demo_tenant_001 CASCADE;
DROP SCHEMA IF EXISTS production_tenant CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;

-- Create public tables
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    max_stations INTEGER NOT NULL DEFAULT 5,
    max_pumps_per_station INTEGER NOT NULL DEFAULT 10,
    max_nozzles_per_pump INTEGER NOT NULL DEFAULT 4,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    schema_name TEXT NOT NULL UNIQUE,
    plan_id UUID REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'superadmin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create production tenant schema
CREATE SCHEMA IF NOT EXISTS production_tenant;

-- Production tenant tables
CREATE TABLE production_tenant.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'attendant')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_tenant.stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_tenant.pumps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    station_id UUID NOT NULL REFERENCES production_tenant.stations(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    serial_number VARCHAR(100),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_tenant.nozzles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    pump_id UUID NOT NULL REFERENCES production_tenant.pumps(id) ON DELETE CASCADE,
    nozzle_number INTEGER NOT NULL,
    fuel_type TEXT NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'premium')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_tenant.fuel_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    station_id UUID NOT NULL REFERENCES production_tenant.stations(id) ON DELETE CASCADE,
    fuel_type TEXT NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'premium')),
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_tenant.creditors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    party_name TEXT NOT NULL,
    contact_number TEXT,
    address TEXT,
    credit_limit DECIMAL(10,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_tenant.nozzle_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    nozzle_id UUID NOT NULL REFERENCES production_tenant.nozzles(id) ON DELETE CASCADE,
    reading DECIMAL(10,3) NOT NULL CHECK (reading >= 0),
    recorded_at TIMESTAMPTZ NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'upi', 'credit')),
    creditor_id UUID REFERENCES production_tenant.creditors(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_tenant.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    nozzle_id UUID NOT NULL REFERENCES production_tenant.nozzles(id),
    station_id UUID NOT NULL REFERENCES production_tenant.stations(id),
    volume DECIMAL(10,3) NOT NULL CHECK (volume >= 0),
    fuel_type TEXT NOT NULL,
    fuel_price DECIMAL(10,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'credit')),
    creditor_id UUID REFERENCES production_tenant.creditors(id),
    status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted')),
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_tenant.credit_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    creditor_id UUID NOT NULL REFERENCES production_tenant.creditors(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'check')),
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON production_tenant.users(email);
CREATE INDEX idx_pumps_station ON production_tenant.pumps(station_id);
CREATE INDEX idx_nozzles_pump ON production_tenant.nozzles(pump_id);
CREATE INDEX idx_readings_nozzle_date ON production_tenant.nozzle_readings(nozzle_id, recorded_at);
CREATE INDEX idx_sales_recorded_at ON production_tenant.sales(recorded_at);
CREATE INDEX idx_sales_station_date ON production_tenant.sales(station_id, recorded_at);
CREATE INDEX idx_fuel_prices_station_type ON production_tenant.fuel_prices(station_id, fuel_type);