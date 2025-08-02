-- Add status column to nozzle_readings table
ALTER TABLE public.nozzle_readings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add status column to sales table if it doesn't exist
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'posted';

-- Create reading_audit_log table
CREATE TABLE IF NOT EXISTS public.reading_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  reading_id UUID NOT NULL,
  user_id UUID NOT NULL, -- renamed from performed_by for consistency
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  -- Foreign keys removed to avoid Azure deployment issues
);

-- Add missing columns if table already exists
ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS new_values JSONB;
ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Update performed_by to user_id if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reading_audit_log' AND column_name = 'performed_by') THEN
    UPDATE public.reading_audit_log SET user_id = performed_by WHERE user_id IS NULL;
    ALTER TABLE public.reading_audit_log DROP COLUMN IF EXISTS performed_by;
  END IF;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reading_audit_log_reading_id ON public.reading_audit_log(reading_id);
CREATE INDEX IF NOT EXISTS idx_reading_audit_log_tenant_id ON public.reading_audit_log(tenant_id);

-- Update existing readings to have 'active' status
UPDATE public.nozzle_readings SET status = 'active' WHERE status IS NULL;

-- Add comment to explain the purpose of the table
COMMENT ON TABLE public.reading_audit_log IS 'Audit trail for nozzle reading operations like voiding';