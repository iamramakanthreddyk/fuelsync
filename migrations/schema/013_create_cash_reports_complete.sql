-- Create complete cash_reports table with all required columns
CREATE TABLE IF NOT EXISTS public.cash_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    station_id UUID NOT NULL,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    shift VARCHAR(20) CHECK (shift IN ('morning', 'afternoon', 'night')) DEFAULT 'morning',
    cash_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    card_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    upi_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    credit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) CHECK (status IN ('submitted', 'approved', 'rejected')) DEFAULT 'submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, station_id, user_id, date, shift)
);

CREATE INDEX IF NOT EXISTS idx_cash_reports_tenant ON public.cash_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_reports_station_date ON public.cash_reports(station_id, date);

COMMENT ON TABLE public.cash_reports IS 'Daily cash reports by payment method';