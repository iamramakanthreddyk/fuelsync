-- Add missing columns and constraints to cash_reports table
ALTER TABLE public.cash_reports 
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Update existing records to have total_amount
UPDATE public.cash_reports 
SET total_amount = COALESCE(cash_amount, 0) + COALESCE(card_amount, 0) + COALESCE(upi_amount, 0) + COALESCE(credit_amount, 0)
WHERE total_amount = 0;

-- Add unique constraint for proper conflict resolution
ALTER TABLE public.cash_reports 
DROP CONSTRAINT IF EXISTS cash_reports_tenant_station_user_date_shift_key;

ALTER TABLE public.cash_reports 
ADD CONSTRAINT cash_reports_tenant_station_user_date_shift_key 
UNIQUE (tenant_id, station_id, user_id, date, shift);