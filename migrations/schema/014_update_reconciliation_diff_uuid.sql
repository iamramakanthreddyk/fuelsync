-- Migration: 014_update_reconciliation_diff_uuid
-- Description: Create reconciliation_diff table and set UUID columns

BEGIN;

-- Create the table first if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reconciliation_diff (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  station_id TEXT NOT NULL,
  date DATE NOT NULL,
  reported_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  difference NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('match', 'over', 'short')),
  cash_report_id TEXT,
  reconciliation_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS reconciliation_diff_tenant_station_date_idx 
ON public.reconciliation_diff(tenant_id, station_id, date);

CREATE INDEX IF NOT EXISTS reconciliation_diff_cash_report_idx 
ON public.reconciliation_diff(cash_report_id);

CREATE INDEX IF NOT EXISTS reconciliation_diff_reconciliation_idx 
ON public.reconciliation_diff(reconciliation_id);

-- Now alter columns to UUID if table exists and has data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reconciliation_diff' AND table_schema = 'public') THEN
    ALTER TABLE public.reconciliation_diff
      ALTER COLUMN id TYPE UUID USING id::uuid,
      ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid,
      ALTER COLUMN station_id TYPE UUID USING station_id::uuid,
      ALTER COLUMN cash_report_id TYPE UUID USING cash_report_id::uuid,
      ALTER COLUMN reconciliation_id TYPE UUID USING reconciliation_id::uuid;
  END IF;
END $$;

INSERT INTO public.schema_migrations (version, description)
VALUES ('014', 'Create reconciliation_diff table and alter columns to UUID')
ON CONFLICT (version) DO NOTHING;

COMMIT;
