-- Simple daily closure enhancement - just add essential columns
-- This works regardless of existing table structure

-- Add columns to day_reconciliations table
ALTER TABLE public.day_reconciliations 
ADD COLUMN IF NOT EXISTS reported_cash_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_reason TEXT,
ADD COLUMN IF NOT EXISTS closed_by UUID,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;

-- Add constraint to ensure cash amount is not negative (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_cash_positive' 
        AND table_name = 'day_reconciliations'
    ) THEN
        ALTER TABLE public.day_reconciliations 
        ADD CONSTRAINT check_cash_positive 
        CHECK (reported_cash_amount >= 0);
    END IF;
END $$;

-- Simple function to check if day is closed (works with any table structure)
CREATE OR REPLACE FUNCTION is_day_closed_simple(p_station_id UUID, p_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.day_reconciliations 
        WHERE station_id = p_station_id 
        AND date = p_date 
        AND finalized = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- Update existing reconciliation service to handle cash closure
-- This will be done in the application code, not in SQL