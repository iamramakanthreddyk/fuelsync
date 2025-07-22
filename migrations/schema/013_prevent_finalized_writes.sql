-- Migration: 013_prevent_finalized_writes
-- Description: Block inserts into nozzle_readings and cash_reports after a day is finalized

-- Function to prevent nozzle readings after finalization
CREATE OR REPLACE FUNCTION public.prevent_finalized_nozzle_reading()
RETURNS TRIGGER AS $$
DECLARE
  station uuid;
  rec_date date;
BEGIN
  SELECT p.station_id INTO station
  FROM public.nozzles n
  JOIN public.pumps p ON n.pump_id = p.id
  WHERE n.id = NEW.nozzle_id;
  rec_date := DATE(NEW.recorded_at);
  IF EXISTS (
    SELECT 1 FROM public.day_reconciliations
    WHERE tenant_id = NEW.tenant_id
      AND station_id = station
      AND date = rec_date
      AND finalized = true
  ) THEN
    RAISE EXCEPTION 'Day already finalized for this station';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_finalized_nozzle_reading
BEFORE INSERT ON public.nozzle_readings
FOR EACH ROW EXECUTE PROCEDURE public.prevent_finalized_nozzle_reading();

-- Function to prevent cash reports after finalization
CREATE OR REPLACE FUNCTION public.prevent_finalized_cash_report()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.day_reconciliations
    WHERE tenant_id = NEW.tenant_id
      AND station_id = NEW.station_id
      AND date = NEW.date
      AND finalized = true
  ) THEN
    RAISE EXCEPTION 'Day already finalized for this station';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_finalized_cash_report
BEFORE INSERT ON public.cash_reports
FOR EACH ROW EXECUTE PROCEDURE public.prevent_finalized_cash_report();
