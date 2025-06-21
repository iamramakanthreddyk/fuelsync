-- Template migration for creating a tenant schema
-- Replace {{schema_name}} with the target schema

CREATE SCHEMA IF NOT EXISTS {{schema_name}};

CREATE TABLE IF NOT EXISTS {{schema_name}}.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.pumps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.nozzles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    pump_id UUID REFERENCES {{schema_name}}.pumps(id) ON DELETE CASCADE,
    nozzle_number INTEGER NOT NULL,
    fuel_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.user_stations (
    user_id UUID REFERENCES {{schema_name}}.users(id) ON DELETE CASCADE,
    station_id UUID REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, station_id)
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.nozzle_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    nozzle_id UUID REFERENCES {{schema_name}}.nozzles(id) ON DELETE CASCADE,
    reading NUMERIC NOT NULL CHECK (reading > 0),
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_readings_nozzle_date
    ON {{schema_name}}.nozzle_readings(nozzle_id, recorded_at);

CREATE TABLE IF NOT EXISTS {{schema_name}}.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    nozzle_reading_id UUID REFERENCES {{schema_name}}.nozzle_readings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES {{schema_name}}.users(id) ON DELETE CASCADE,
    volume NUMERIC NOT NULL CHECK (volume > 0),
    price_per_litre NUMERIC NOT NULL CHECK (price_per_litre > 0),
    sale_amount NUMERIC NOT NULL CHECK (sale_amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.fuel_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE,
    fuel_type TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price > 0),
    effective_from TIMESTAMP NOT NULL,
    effective_to TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional trigger example to auto-close previous price row
-- CREATE OR REPLACE FUNCTION {{schema_name}}.close_prev_price() RETURNS TRIGGER AS $$
-- BEGIN
--   UPDATE {{schema_name}}.fuel_prices
--   SET effective_to = NEW.effective_from
--   WHERE station_id = NEW.station_id
--     AND fuel_type = NEW.fuel_type
--     AND effective_to IS NULL;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER trg_close_prev_price
-- BEFORE INSERT ON {{schema_name}}.fuel_prices
-- FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.close_prev_price();

CREATE TABLE IF NOT EXISTS {{schema_name}}.creditors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    credit_limit NUMERIC NOT NULL CHECK (credit_limit >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.credit_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    creditor_id UUID REFERENCES {{schema_name}}.creditors(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    reference_number TEXT,
    paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
    credited_by UUID REFERENCES {{schema_name}}.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.fuel_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    station_id UUID REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE,
    litres_delivered NUMERIC NOT NULL CHECK (litres_delivered > 0),
    supplier TEXT NOT NULL,
    delivered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.fuel_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    station_id UUID REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE,
    volume NUMERIC NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.day_reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    station_id UUID REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE,
    reconciled_on DATE NOT NULL,
    total_sales NUMERIC NOT NULL,
    finalized BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(station_id, reconciled_on)
);

