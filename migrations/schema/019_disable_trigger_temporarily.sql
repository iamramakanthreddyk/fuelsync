-- Migration: 019_disable_trigger_temporarily
-- Description: Temporarily disable the problematic trigger

-- Drop the trigger temporarily
DROP TRIGGER IF EXISTS trg_prevent_finalized_nozzle_reading ON public.nozzle_readings;

-- We'll recreate it later once we fix the UUID casting issues