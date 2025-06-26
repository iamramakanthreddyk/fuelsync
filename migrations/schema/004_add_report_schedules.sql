-- Description: add report_schedules table
BEGIN;
CREATE TABLE IF NOT EXISTS public.report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    station_id UUID REFERENCES public.stations(id),
    type TEXT NOT NULL,
    frequency TEXT NOT NULL,
    next_run TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_report_schedules_tenant ON public.report_schedules(tenant_id);
COMMENT ON TABLE public.report_schedules IS 'Scheduled report configuration';
COMMIT;
