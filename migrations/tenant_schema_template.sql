-- Template migration for creating a tenant schema
-- Replace {{schema_name}} with the target schema

CREATE SCHEMA IF NOT EXISTS {{schema_name}};

CREATE TABLE IF NOT EXISTS {{schema_name}}.users (
    id UUID PRIMARY KEY(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS {{schema_name}}.stations (
    id UUID PRIMARY KEY(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.pumps (
    id UUID PRIMARY KEY(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    station_id UUID NOT NULL REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.nozzles (
    id UUID PRIMARY KEY(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    pump_id UUID REFERENCES {{schema_name}}.pumps(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    nozzle_number INTEGER NOT NULL,
    fuel_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.user_stations (
    user_id UUID REFERENCES {{schema_name}}.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    station_id UUID REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, station_id)
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.nozzle_readings (
    id UUID PRIMARY KEY(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    nozzle_id UUID REFERENCES {{schema_name}}.nozzles(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    reading NUMERIC NOT NULL CHECK (reading >= 0),
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_readings_nozzle_date
    ON {{schema_name}}.nozzle_readings(nozzle_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_readings_recorded_at
    ON {{schema_name}}.nozzle_readings(recorded_at);

CREATE TABLE IF NOT EXISTS {{schema_name}}.creditors (
    id UUID PRIMARY KEY(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    party_name TEXT NOT NULL,
    contact_person TEXT,
    contact_phone TEXT,
    email TEXT,
    credit_limit NUMERIC CHECK (credit_limit >= 0),
    balance NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS {{schema_name}}.sales (
    id UUID PRIMARY KEY(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    nozzle_id UUID REFERENCES {{schema_name}}.nozzles(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    user_id UUID REFERENCES {{schema_name}}.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    reading_id UUID REFERENCES {{schema_name}}.nozzle_readings(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    creditor_id UUID REFERENCES {{schema_name}}.creditors(id) DEFERRABLE INITIALLY DEFERRED,
    volume NUMERIC NOT NULL CHECK (volume >= 0),
    price NUMERIC NOT NULL CHECK (price > 0),
    amount NUMERIC GENERATED ALWAYS AS (volume * price) STORED,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'credit')),
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_recorded_at
    ON {{schema_name}}.sales(recorded_at);

CREATE TABLE IF NOT EXISTS {{schema_name}}.fuel_prices (
    id UUID PRIMARY KEY(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    station_id UUID NOT NULL REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    fuel_type TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price > 0),
    effective_from TIMESTAMP NOT NULL,
    effective_to TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_effective_from
    ON {{schema_name}}.fuel_prices(effective_from);

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


CREATE TABLE IF NOT EXISTS {{schema_name}}.credit_payments (
    id UUID PRIMARY KEY(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    creditor_id UUID REFERENCES {{schema_name}}.creditors(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'check')),
    reference_number TEXT,
    notes TEXT,
    received_by UUID REFERENCES {{schema_name}}.users(id) DEFERRABLE INITIALLY DEFERRED,
    received_at TIMESTAMP NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_payments_received_at
    ON {{schema_name}}.credit_payments(received_at);

CREATE TABLE IF NOT EXISTS {{schema_name}}.fuel_deliveries (
    id UUID PRIMARY KEY(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    station_id UUID REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    fuel_type TEXT NOT NULL,
    volume NUMERIC CHECK (volume > 0),
    delivered_by TEXT,
    delivery_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.fuel_inventory (
    id UUID PRIMARY KEY(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    station_id UUID REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    fuel_type TEXT NOT NULL,
    current_volume NUMERIC CHECK (current_volume >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS {{schema_name}}.day_reconciliations (
    id UUID PRIMARY KEY(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    station_id UUID REFERENCES {{schema_name}}.stations(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    reconciliation_date DATE NOT NULL,
    total_sales NUMERIC NOT NULL DEFAULT 0,
    cash_sales NUMERIC NOT NULL DEFAULT 0,
    card_sales NUMERIC NOT NULL DEFAULT 0,
    upi_sales NUMERIC NOT NULL DEFAULT 0,
    credit_sales NUMERIC NOT NULL DEFAULT 0,
    total_credit_outstanding NUMERIC NOT NULL DEFAULT 0,
    finalized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(station_id, reconciliation_date)
);
CREATE INDEX IF NOT EXISTS idx_day_reconciliations_date
    ON {{schema_name}}.day_reconciliations(reconciliation_date);

