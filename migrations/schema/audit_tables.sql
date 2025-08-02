-- Reading audit log table (extend existing table)
-- The table already exists from 20250714 migration, just ensure all columns exist
ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS new_values JSONB;
ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Ensure user_id column exists (it should from the previous migration fix)
ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS user_id UUID;

-- Simple function to log reading audit
CREATE OR REPLACE FUNCTION log_reading_audit(
  p_reading_id UUID,
  p_tenant_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.reading_audit_log (
    reading_id, tenant_id, user_id, action, reason, created_at
  ) VALUES (
    p_reading_id, p_tenant_id, p_user_id, p_action, p_reason, NOW()
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Basic indexes for reading audit log
CREATE INDEX IF NOT EXISTS idx_reading_audit_log_reading_id
ON public.reading_audit_log (reading_id);

CREATE INDEX IF NOT EXISTS idx_reading_audit_log_tenant_date
ON public.reading_audit_log (tenant_id, created_at DESC);
