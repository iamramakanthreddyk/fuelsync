-- sql/tenant_schema_template.sql

-- Example: template schema for new tenant
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'attendant')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) DEFERRABLE INITIALLY DEFERRED,
  label TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nozzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pump_id UUID NOT NULL REFERENCES pumps(id) DEFERRABLE INITIALLY DEFERRED,
  fuel_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fuel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type TEXT NOT NULL,
  price_per_litre NUMERIC(10, 2) NOT NULL CHECK (price_per_litre > 0),
  effective_from TIMESTAMP NOT NULL,
  effective_to TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nozzle_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nozzle_id UUID NOT NULL REFERENCES nozzles(id) DEFERRABLE INITIALLY DEFERRED,
  reading NUMERIC(10, 2) NOT NULL,
  recorded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nozzle_id UUID NOT NULL REFERENCES nozzles(id) DEFERRABLE INITIALLY DEFERRED,
  user_id UUID NOT NULL REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED,
  volume_sold NUMERIC(10, 2) NOT NULL,
  sale_amount NUMERIC(10, 2) NOT NULL,
  sold_at TIMESTAMP NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'upi', 'card', 'credit')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
