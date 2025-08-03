-- Migration: 018_fix_trigger_uuid_casting
-- Description: Fix UUID casting issues in trigger functions

-- Fix the prevent_finalized_nozzle_reading function
CREATE OR REPLACE FUNCTION public.prevent_finalized_nozzle_reading()
RETURNS TRIGGER AS $$
DECLARE
  station_uuid uuid;
  rec_date date;
BEGIN
  SELECT p.station_id INTO station_uuid
  FROM public.nozzles n
  JOIN public.pumps p ON n.pump_id = p.id
  WHERE n.id = CAST(NEW.nozzle_id AS uuid);
  
  rec_date := DATE(NEW.recorded_at);
  
  IF EXISTS (
    SELECT 1 FROM public.day_reconciliations
    WHERE tenant_id = CAST(NEW.tenant_id AS uuid)
      AND station_id = station_uuid
      AND date = rec_date
      AND finalized = true
  ) THEN
    RAISE EXCEPTION 'Day already finalized for this station';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix the prevent_finalized_cash_report function
CREATE OR REPLACE FUNCTION public.prevent_finalized_cash_report()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.day_reconciliations
    WHERE tenant_id = CAST(NEW.tenant_id AS uuid)
      AND station_id = CAST(NEW.station_id AS uuid)
      AND date = NEW.date
      AND finalized = true
  ) THEN
    RAISE EXCEPTION 'Day already finalized for this station';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;