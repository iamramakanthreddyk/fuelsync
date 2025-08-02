-- Role-based access control tables and functions
-- This migration adds tables needed for comprehensive role-based access control

-- User role access log (track when users try to access features they shouldn't)
CREATE TABLE IF NOT EXISTS public.role_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  feature_requested TEXT NOT NULL,
  action_requested TEXT NOT NULL,
  access_granted BOOLEAN NOT NULL DEFAULT FALSE,
  denial_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Foreign keys removed to avoid Azure deployment issues
);

-- Indexes for role access log
CREATE INDEX IF NOT EXISTS idx_role_access_log_tenant_date 
ON public.role_access_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_role_access_log_user_feature 
ON public.role_access_log (user_id, feature_requested, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_role_access_log_denied 
ON public.role_access_log (access_granted, created_at DESC) 
WHERE access_granted = FALSE;

-- Plan feature usage tracking
CREATE TABLE IF NOT EXISTS public.plan_feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  plan_tier TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 1,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, user_id, feature_name, usage_date)
  -- Foreign keys removed to avoid Azure deployment issues
);

-- Indexes for plan feature usage
CREATE INDEX IF NOT EXISTS idx_plan_feature_usage_tenant_date 
ON public.plan_feature_usage (tenant_id, usage_date DESC);

CREATE INDEX IF NOT EXISTS idx_plan_feature_usage_feature 
ON public.plan_feature_usage (feature_name, usage_date DESC);

-- Function to log role access attempts
CREATE OR REPLACE FUNCTION log_role_access(
  p_tenant_id UUID,
  p_user_id UUID,
  p_user_role TEXT,
  p_plan_tier TEXT,
  p_feature_requested TEXT,
  p_action_requested TEXT,
  p_access_granted BOOLEAN,
  p_denial_reason TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.role_access_log (
    tenant_id, user_id, user_role, plan_tier, feature_requested, action_requested,
    access_granted, denial_reason, ip_address, user_agent, created_at
  ) VALUES (
    p_tenant_id, p_user_id, p_user_role, p_plan_tier, p_feature_requested, p_action_requested,
    p_access_granted, p_denial_reason, p_ip_address, p_user_agent, NOW()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to track feature usage
CREATE OR REPLACE FUNCTION track_feature_usage(
  p_tenant_id UUID,
  p_user_id UUID,
  p_plan_tier TEXT,
  p_feature_name TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.plan_feature_usage (
    tenant_id, user_id, plan_tier, feature_name, usage_count, usage_date, created_at, updated_at
  ) VALUES (
    p_tenant_id, p_user_id, p_plan_tier, p_feature_name, 1, CURRENT_DATE, NOW(), NOW()
  )
  ON CONFLICT (tenant_id, user_id, feature_name, usage_date)
  DO UPDATE SET 
    usage_count = plan_feature_usage.usage_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to log reading audit (enhanced version)
CREATE OR REPLACE FUNCTION log_reading_audit(
  p_reading_id UUID,
  p_tenant_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.reading_audit_log (
    reading_id, tenant_id, user_id, action, old_values, new_values, 
    reason, ip_address, user_agent, created_at
  ) VALUES (
    p_reading_id, p_tenant_id, p_user_id, p_action, p_old_values, p_new_values,
    p_reason, p_ip_address, p_user_agent, NOW()
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Note: Views will be created in a separate migration after all tables are confirmed to exist

-- Add comments for documentation
COMMENT ON TABLE public.role_access_log IS 'Tracks all role-based access attempts for security and compliance monitoring';
COMMENT ON TABLE public.plan_feature_usage IS 'Tracks feature usage by plan tier for analytics and billing';
