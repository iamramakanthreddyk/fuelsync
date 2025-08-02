-- Fix the prevent_finalized_nozzle_reading trigger
-- The issue is in the UUID comparison in the trigger

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trg_prevent_finalized_nozzle_reading ON public.nozzle_readings;
DROP FUNCTION IF EXISTS public.prevent_finalized_nozzle_reading();

-- Recreate the function with proper type handling
CREATE OR REPLACE FUNCTION public.prevent_finalized_nozzle_reading()
RETURNS TRIGGER AS $$
DECLARE
  station_uuid uuid;
  rec_date date;
BEGIN
  -- Get station_id from nozzle
  SELECT p.station_id INTO station_uuid
  FROM public.nozzles n
  JOIN public.pumps p ON n.pump_id = p.id
  WHERE n.id = NEW.nozzle_id;
  
  -- Get the date
  rec_date := DATE(NEW.recorded_at);
  
  -- Check if day is finalized with explicit casting
  IF EXISTS (
    SELECT 1 FROM public.day_reconciliations
    WHERE tenant_id::uuid = NEW.tenant_id::uuid
      AND station_id::uuid = station_uuid::uuid
      AND date::date = rec_date::date
      AND finalized = true
  ) THEN
    RAISE EXCEPTION 'Day already finalized for this station';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trg_prevent_finalized_nozzle_reading
BEFORE INSERT ON public.nozzle_readings
FOR EACH ROW EXECUTE PROCEDURE public.prevent_finalized_nozzle_reading();
