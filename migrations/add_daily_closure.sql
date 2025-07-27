-- Enhance existing day_reconciliations table for daily closure
-- Add columns to existing table instead of creating new one

ALTER TABLE public.day_reconciliations 
ADD COLUMN IF NOT EXISTS reported_cash_amount DECIMAL(10,2) DEFAULT 0 CHECK (reported_cash_amount >= 0),
ADD COLUMN IF NOT EXISTS variance_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance_reason TEXT,
ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;

-- Update constraints
ALTER TABLE public.day_reconciliations 
ADD CONSTRAINT check_closure_consistency 
CHECK (NOT finalized OR closed_by IS NOT NULL);

-- Create index for performance (check if tenant_id exists first)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'day_reconciliations' 
               AND column_name = 'tenant_id') THEN
        CREATE INDEX IF NOT EXISTS idx_day_reconciliations_open 
        ON public.day_reconciliations(tenant_id, station_id, finalized) 
        WHERE finalized = FALSE;
    ELSE
        CREATE INDEX IF NOT EXISTS idx_day_reconciliations_open 
        ON public.day_reconciliations(station_id, finalized) 
        WHERE finalized = FALSE;
    END IF;
END $$;

-- Function to check if a day is closed (handle both with/without tenant_id)
CREATE OR REPLACE FUNCTION is_day_closed(p_tenant_id UUID, p_station_id UUID, p_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if tenant_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'day_reconciliations' 
               AND column_name = 'tenant_id') THEN
        RETURN EXISTS (
            SELECT 1 FROM public.day_reconciliations 
            WHERE tenant_id = p_tenant_id 
            AND station_id = p_station_id 
            AND date = p_date 
            AND finalized = TRUE
        );
    ELSE
        RETURN EXISTS (
            SELECT 1 FROM public.day_reconciliations 
            WHERE station_id = p_station_id 
            AND date = p_date 
            AND finalized = TRUE
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to safely close a day (handle both with/without tenant_id)
CREATE OR REPLACE FUNCTION close_business_day(
    p_tenant_id UUID,
    p_station_id UUID, 
    p_date DATE,
    p_cash_amount DECIMAL(10,2),
    p_reason TEXT,
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_reconciliation_id UUID;
    v_system_amount DECIMAL(10,2);
    v_variance DECIMAL(10,2);
    has_tenant_id BOOLEAN;
BEGIN
    -- Validate inputs
    IF p_cash_amount < 0 THEN
        RAISE EXCEPTION 'Cash amount cannot be negative: %', p_cash_amount;
    END IF;
    
    IF p_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot close future date: %', p_date;
    END IF;
    
    -- Check if tenant_id column exists
    SELECT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'day_reconciliations' 
                   AND column_name = 'tenant_id') INTO has_tenant_id;
    
    -- Get or create reconciliation record
    IF has_tenant_id THEN
        INSERT INTO public.day_reconciliations (id, tenant_id, station_id, date, finalized)
        VALUES (gen_random_uuid(), p_tenant_id, p_station_id, p_date, FALSE)
        ON CONFLICT (tenant_id, station_id, date) DO NOTHING;
        
        SELECT id, COALESCE(total_sales, 0) INTO v_reconciliation_id, v_system_amount
        FROM public.day_reconciliations 
        WHERE tenant_id = p_tenant_id 
        AND station_id = p_station_id 
        AND date = p_date
        FOR UPDATE;
    ELSE
        INSERT INTO public.day_reconciliations (id, station_id, date, finalized)
        VALUES (gen_random_uuid(), p_station_id, p_date, FALSE)
        ON CONFLICT (station_id, date) DO NOTHING;
        
        SELECT id, COALESCE(total_sales, 0) INTO v_reconciliation_id, v_system_amount
        FROM public.day_reconciliations 
        WHERE station_id = p_station_id 
        AND date = p_date
        FOR UPDATE;
    END IF;
    
    -- Check if already closed
    IF EXISTS (
        SELECT 1 FROM public.day_reconciliations 
        WHERE id = v_reconciliation_id AND finalized = TRUE
    ) THEN
        RAISE EXCEPTION 'Business day already closed for date: %', p_date;
    END IF;
    
    -- Calculate variance
    v_variance := p_cash_amount - v_system_amount;
    
    -- Require reason for significant variance (> ₹1)
    IF ABS(v_variance) > 1.00 AND (p_reason IS NULL OR TRIM(p_reason) = '') THEN
        RAISE EXCEPTION 'Variance explanation required for difference of %', v_variance;
    END IF;
    
    -- Update reconciliation with closure data
    UPDATE public.day_reconciliations SET
        reported_cash_amount = p_cash_amount,
        variance_amount = v_variance,
        variance_reason = p_reason,
        finalized = TRUE,
        closed_by = p_user_id,
        closed_at = NOW(),
        updated_at = COALESCE(updated_at, NOW())
    WHERE id = v_reconciliation_id;
    
    RETURN v_reconciliation_id;
END;
$$ LANGUAGE plpgsql;

-- Enhanced trigger to prevent entries after closure (handle tenant_id gracefully)
CREATE OR REPLACE FUNCTION prevent_closed_day_entries()
RETURNS TRIGGER AS $$
DECLARE
    entry_date DATE;
    station_uuid UUID;
    tenant_uuid UUID;
BEGIN
    -- Get the date and station from the entry
    IF TG_TABLE_NAME = 'nozzle_readings' THEN
        entry_date := DATE(NEW.recorded_at);
        -- Get station from nozzle -> pump -> station
        SELECT p.station_id INTO station_uuid
        FROM nozzles n 
        JOIN pumps p ON n.pump_id = p.id 
        WHERE n.id = NEW.nozzle_id;
    ELSIF TG_TABLE_NAME = 'cash_reports' THEN
        entry_date := DATE(NEW.reported_at);
        station_uuid := NEW.station_id;
    END IF;
    
    -- Get tenant_id if column exists
    BEGIN
        tenant_uuid := NEW.tenant_id;
    EXCEPTION
        WHEN undefined_column THEN
            tenant_uuid := NULL;
    END;
    
    -- Prevent future entries
    IF entry_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot add entries for future date: %', entry_date;
    END IF;
    
    -- Check if day is finalized (closed) - use NULL for tenant if not available
    IF is_day_closed(COALESCE(tenant_uuid, '00000000-0000-0000-0000-000000000000'::UUID), station_uuid, entry_date) THEN
        RAISE EXCEPTION 'Cannot add entries for finalized business day: % (Station: %)', entry_date, station_uuid;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS prevent_nozzle_reading_after_closure ON nozzle_readings;
CREATE TRIGGER prevent_nozzle_reading_after_closure
    BEFORE INSERT OR UPDATE ON nozzle_readings
    FOR EACH ROW EXECUTE FUNCTION prevent_closed_day_entries();

DROP TRIGGER IF EXISTS prevent_cash_report_after_closure ON cash_reports;
CREATE TRIGGER prevent_cash_report_after_closure
    BEFORE INSERT OR UPDATE ON cash_reports
    FOR EACH ROW EXECUTE FUNCTION prevent_closed_day_entries();