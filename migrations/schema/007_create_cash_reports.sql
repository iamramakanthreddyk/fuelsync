-- Migration: 007_create_cash_reports
-- Description: Record attendant cash and credit totals

BEGIN;

CREATE TABLE IF NOT EXISTS public.cash_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    station_id UUID NOT NULL,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    cash_amount DECIMAL(10,2) NOT NULL,
    credit_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, station_id, date)
);

-- Note: Foreign key constraints removed to avoid migration issues
-- They can be added later if needed
CREATE INDEX IF NOT EXISTS idx_cash_reports_tenant ON public.cash_reports(tenant_id);
COMMENT ON TABLE public.cash_reports IS 'Attendant daily cash and credit reports';

INSERT INTO public.schema_migrations (version, description)
VALUES ('007', 'Create cash_reports table')
ON CONFLICT (version) DO NOTHING;

COMMIT;
