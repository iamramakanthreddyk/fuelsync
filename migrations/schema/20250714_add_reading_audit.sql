-- Add status column to nozzle_readings table
ALTER TABLE public.nozzle_readings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Create reading_audit_log table
CREATE TABLE IF NOT EXISTS public.reading_audit_log (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  reading_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  reason TEXT,
  performed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (reading_id) REFERENCES public.nozzle_readings(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reading_audit_log_reading_id ON public.reading_audit_log(reading_id);
CREATE INDEX IF NOT EXISTS idx_reading_audit_log_tenant_id ON public.reading_audit_log(tenant_id);

-- Update existing readings to have 'active' status
UPDATE public.nozzle_readings SET status = 'active' WHERE status IS NULL;

-- Add comment to explain the purpose of the table
COMMENT ON TABLE public.reading_audit_log IS 'Audit trail for nozzle reading operations like voiding';