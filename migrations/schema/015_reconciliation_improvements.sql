-- Migration: 015_reconciliation_improvements
-- Description: Add missing columns and tables for improved reconciliation system

BEGIN;

-- Ensure cash_reports table has all required columns for improved reconciliation
ALTER TABLE public.cash_reports 
ADD COLUMN IF NOT EXISTS card_collected DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS upi_collected DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_collected DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS shift_start_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS shift_end_time TIMESTAMP;

-- Rename cash_amount to cash_collected for consistency
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_reports' AND column_name = 'cash_amount') THEN
        ALTER TABLE public.cash_reports RENAME COLUMN cash_amount TO cash_collected;
    END IF;
END $$;

-- Add check constraint for cash_reports totals (with error handling)
DO $$
BEGIN
    -- Drop constraint if it exists
    BEGIN
        ALTER TABLE public.cash_reports DROP CONSTRAINT chk_cash_reports_total_matches;
    EXCEPTION WHEN undefined_object THEN
        -- Constraint doesn't exist, ignore
    END;

    -- Add the constraint
    ALTER TABLE public.cash_reports
    ADD CONSTRAINT chk_cash_reports_total_matches
    CHECK (total_collected = COALESCE(cash_collected, 0) + COALESCE(card_collected, 0) + COALESCE(upi_collected, 0));
END $$;

-- Ensure nozzle_readings has status column (should already exist from 20250714_add_reading_audit.sql)
ALTER TABLE public.nozzle_readings 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add creditor_id column to nozzle_readings if it doesn't exist
ALTER TABLE public.nozzle_readings 
ADD COLUMN IF NOT EXISTS creditor_id UUID;

-- Note: Foreign key constraint for creditor_id skipped
-- (creditors table may not exist yet)

-- Ensure sales table has status column (should already exist from 20250714_add_reading_audit.sql)
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Update existing records to have proper status values BEFORE adding constraints
UPDATE public.nozzle_readings SET status = 'active' WHERE status IS NULL OR status NOT IN ('active', 'voided', 'corrected');
UPDATE public.sales SET status = 'pending' WHERE status IS NULL OR status NOT IN ('pending', 'reconciled', 'finalized', 'disputed');

-- Add check constraints for status columns
DO $$
BEGIN
    -- Add nozzle_readings status constraint
    BEGIN
        ALTER TABLE public.nozzle_readings
        ADD CONSTRAINT chk_nozzle_readings_status
        CHECK (status IN ('active', 'voided', 'corrected'));
    EXCEPTION WHEN duplicate_object THEN
        -- Constraint already exists, ignore
    END;

    -- Add sales status constraint
    BEGIN
        ALTER TABLE public.sales
        ADD CONSTRAINT chk_sales_status
        CHECK (status IN ('pending', 'reconciled', 'finalized', 'disputed'));
    EXCEPTION WHEN duplicate_object THEN
        -- Constraint already exists, ignore
    END;
END $$;

-- Ensure day_reconciliations table exists with all required columns
CREATE TABLE IF NOT EXISTS public.day_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    station_id UUID NOT NULL,
    date DATE NOT NULL,
    
    -- Reconciliation status
    finalized BOOLEAN DEFAULT FALSE,
    closed_by UUID,
    closed_at TIMESTAMP,
    
    -- Financial summary
    system_total DECIMAL(10,2) DEFAULT 0.00,
    collected_total DECIMAL(10,2) DEFAULT 0.00,
    difference DECIMAL(10,2) DEFAULT 0.00,
    
    -- Breakdown by payment method
    system_cash DECIMAL(10,2) DEFAULT 0.00,
    system_card DECIMAL(10,2) DEFAULT 0.00,
    system_upi DECIMAL(10,2) DEFAULT 0.00,
    system_credit DECIMAL(10,2) DEFAULT 0.00,
    
    collected_cash DECIMAL(10,2) DEFAULT 0.00,
    collected_card DECIMAL(10,2) DEFAULT 0.00,
    collected_upi DECIMAL(10,2) DEFAULT 0.00,
    
    -- Volume summary
    total_volume DECIMAL(10,3) DEFAULT 0.000,
    
    -- Additional info
    notes TEXT,
    discrepancy_reason TEXT,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_day_reconciliations_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_day_reconciliations_station FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE CASCADE,
    CONSTRAINT fk_day_reconciliations_closed_by FOREIGN KEY (closed_by) REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Unique constraint: one reconciliation per station per date
    CONSTRAINT uk_day_reconciliations_station_date UNIQUE (tenant_id, station_id, date)
);

-- Add missing columns to existing day_reconciliations table if they don't exist
ALTER TABLE public.day_reconciliations 
ADD COLUMN IF NOT EXISTS system_cash DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS system_card DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS system_upi DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS system_credit DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS collected_cash DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS collected_card DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS collected_upi DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_volume DECIMAL(10,3) DEFAULT 0.000,
ADD COLUMN IF NOT EXISTS discrepancy_reason TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cash_reports_tenant_station_date 
    ON public.cash_reports(tenant_id, station_id, date);

CREATE INDEX IF NOT EXISTS idx_day_reconciliations_tenant_station_date 
    ON public.day_reconciliations(tenant_id, station_id, date);

CREATE INDEX IF NOT EXISTS idx_day_reconciliations_finalized 
    ON public.day_reconciliations(finalized);

CREATE INDEX IF NOT EXISTS idx_nozzle_readings_status 
    ON public.nozzle_readings(status);

CREATE INDEX IF NOT EXISTS idx_sales_status 
    ON public.sales(status);

-- Note: Status values already updated above before constraint creation

-- Add comments for documentation
COMMENT ON COLUMN public.cash_reports.card_collected IS 'Card payments collected (if handled by attendant)';
COMMENT ON COLUMN public.cash_reports.upi_collected IS 'UPI payments collected (if handled by attendant)';
COMMENT ON COLUMN public.cash_reports.total_collected IS 'Total amount collected (sum of all payment methods)';
COMMENT ON COLUMN public.nozzle_readings.status IS 'Reading status: active, voided, corrected';
COMMENT ON COLUMN public.nozzle_readings.creditor_id IS 'Reference to creditor for credit sales (optional)';
COMMENT ON COLUMN public.sales.status IS 'Reconciliation status: pending, reconciled, finalized, disputed';

-- Record this migration
INSERT INTO public.schema_migrations (version, description)
VALUES ('015', 'Add missing columns and tables for improved reconciliation system')
ON CONFLICT (version) DO NOTHING;

COMMIT;
