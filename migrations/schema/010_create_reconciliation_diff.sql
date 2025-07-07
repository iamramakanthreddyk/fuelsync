-- Create reconciliation_diff table to track differences between reported and actual cash
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS reconciliation_diff_tenant_station_date_idx 
ON public.reconciliation_diff(tenant_id, station_id, date);

-- Create index for cash report lookups
CREATE INDEX IF NOT EXISTS reconciliation_diff_cash_report_idx 
ON public.reconciliation_diff(cash_report_id);

-- Create index for reconciliation lookups
CREATE INDEX IF NOT EXISTS reconciliation_diff_reconciliation_idx 
ON public.reconciliation_diff(reconciliation_id);