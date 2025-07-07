-- Add payment method breakdown columns to cash_reports table
ALTER TABLE public.cash_reports 
ADD COLUMN IF NOT EXISTS card_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS upi_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS shift VARCHAR(20) CHECK (shift IN ('morning', 'afternoon', 'night'));