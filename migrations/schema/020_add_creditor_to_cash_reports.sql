-- Migration: 020_add_creditor_to_cash_reports
-- Description: Add creditor_id to cash_reports to track credit given to specific creditors

BEGIN;

-- Add creditor_id column to cash_reports
ALTER TABLE public.cash_reports 
ADD COLUMN IF NOT EXISTS creditor_id UUID REFERENCES public.creditors(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_cash_reports_creditor ON public.cash_reports(creditor_id);

-- Add comment
COMMENT ON COLUMN public.cash_reports.creditor_id IS 'Reference to creditor when credit_amount > 0';

-- Record migration
INSERT INTO public.schema_migrations (version, description)
VALUES ('020', 'Add creditor_id to cash_reports to track credit given to specific creditors')
ON CONFLICT (version) DO NOTHING;

COMMIT;