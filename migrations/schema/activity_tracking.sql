-- User activity tracking table (extend existing table)
-- The table already exists from master schema, just add missing columns
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS resource TEXT;
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

-- Update created_at from recorded_at for existing records
UPDATE public.user_activity_logs SET created_at = recorded_at WHERE created_at IS NULL;

-- Set default for created_at
ALTER TABLE public.user_activity_logs ALTER COLUMN created_at SET DEFAULT NOW();

-- Indexes for performance (use both old and new column names)
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_tenant_recorded
ON public.user_activity_logs (tenant_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_tenant_created
ON public.user_activity_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action
ON public.user_activity_logs (action, recorded_at DESC) WHERE action IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_resource
ON public.user_activity_logs (resource, recorded_at DESC) WHERE resource IS NOT NULL;

-- Audit logs table (for SuperAdmin actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_date 
ON public.audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON public.audit_logs (action, created_at DESC);

-- Plan usage tracking view
CREATE OR REPLACE VIEW public.plan_usage_summary AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.status as tenant_status,
  p.name as plan_name,
  p.max_stations,
  p.price_monthly,
  
  -- Current usage
  (SELECT COUNT(*) FROM public.stations WHERE tenant_id = t.id) as current_stations,
  (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id) as total_users,
  (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id AND role = 'owner') as owners,
  (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id AND role = 'manager') as managers,
  (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id AND role = 'attendant') as attendants,
  
  -- Activity metrics
  (SELECT COUNT(*) FROM public.user_activity_logs WHERE tenant_id = t.id AND DATE(created_at) = CURRENT_DATE) as activities_today,
  (SELECT COUNT(*) FROM public.user_activity_logs WHERE tenant_id = t.id AND created_at >= CURRENT_DATE - INTERVAL '7 days') as activities_week,
  (SELECT COUNT(*) FROM public.user_activity_logs WHERE tenant_id = t.id AND created_at >= CURRENT_DATE - INTERVAL '30 days') as activities_month,
  
  -- Report usage (will be added when report_generations table exists)
  0 as reports_today,
  0 as reports_month,
  
  -- Plan violations
  (SELECT COUNT(*) FROM public.user_activity_logs WHERE tenant_id = t.id AND action = 'PLAN_LIMIT_EXCEEDED' AND created_at >= CURRENT_DATE - INTERVAL '7 days') as violations_week,
  
  -- Last activity
  (SELECT MAX(recorded_at) FROM public.user_activity_logs WHERE tenant_id = t.id) as last_activity,
  (SELECT MAX(updated_at) FROM public.users WHERE tenant_id = t.id) as last_user_login,
  
  -- Compliance status
  CASE 
    WHEN (SELECT COUNT(*) FROM public.stations WHERE tenant_id = t.id) > p.max_stations THEN 'OVER_STATION_LIMIT'
    WHEN (SELECT COUNT(*) FROM public.user_activity_logs WHERE tenant_id = t.id AND action = 'PLAN_LIMIT_EXCEEDED' AND created_at >= CURRENT_DATE - INTERVAL '24 hours') > 10 THEN 'EXCESSIVE_VIOLATIONS'
    WHEN t.status != 'active' THEN 'INACTIVE'
    ELSE 'COMPLIANT'
  END as compliance_status

FROM public.tenants t
LEFT JOIN public.plans p ON t.plan_id = p.id
ORDER BY t.created_at DESC;

-- Activity summary by action
CREATE OR REPLACE VIEW public.activity_summary_by_action AS
SELECT 
  action,
  COUNT(*) as total_count,
  COUNT(DISTINCT tenant_id) as unique_tenants,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_count,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_count,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as month_count,
  MAX(created_at) as last_occurrence
FROM public.user_activity_logs
GROUP BY action
ORDER BY total_count DESC;

-- Suspicious activity detection view
CREATE OR REPLACE VIEW public.suspicious_activities AS
SELECT DISTINCT
  ual.id,
  ual.tenant_id,
  t.name as tenant_name,
  ual.user_id,
  u.name as user_name,
  u.role as user_role,
  ual.action,
  ual.resource,
  ual.details,
  ual.ip_address,
  ual.created_at,
  'MULTIPLE_FAILED_LOGINS' as suspicion_reason
FROM public.user_activity_logs ual
LEFT JOIN public.tenants t ON ual.tenant_id = t.id
LEFT JOIN public.users u ON ual.user_id = u.id
WHERE ual.action = 'LOGIN_FAILED'
  AND (
    SELECT COUNT(*) 
    FROM public.user_activity_logs ual2 
    WHERE ual2.user_id = ual.user_id 
      AND ual2.action = 'LOGIN_FAILED' 
      AND ual2.created_at >= ual.created_at - INTERVAL '1 hour'
  ) >= 5

UNION ALL

SELECT DISTINCT
  ual.id,
  ual.tenant_id,
  t.name as tenant_name,
  ual.user_id,
  u.name as user_name,
  u.role as user_role,
  ual.action,
  ual.resource,
  ual.details,
  ual.ip_address,
  ual.created_at,
  'EXCESSIVE_PLAN_VIOLATIONS' as suspicion_reason
FROM public.user_activity_logs ual
LEFT JOIN public.tenants t ON ual.tenant_id = t.id
LEFT JOIN public.users u ON ual.user_id = u.id
WHERE ual.action = 'PLAN_LIMIT_EXCEEDED'
  AND (
    SELECT COUNT(*) 
    FROM public.user_activity_logs ual2 
    WHERE ual2.tenant_id = ual.tenant_id 
      AND ual2.action = 'PLAN_LIMIT_EXCEEDED' 
      AND ual2.created_at >= CURRENT_DATE - INTERVAL '24 hours'
  ) >= 20

UNION ALL

SELECT DISTINCT
  ual.id,
  ual.tenant_id,
  t.name as tenant_name,
  ual.user_id,
  u.name as user_name,
  u.role as user_role,
  ual.action,
  ual.resource,
  ual.details,
  ual.ip_address,
  ual.created_at,
  'ADMIN_ACTIONS_BY_NON_ADMIN' as suspicion_reason
FROM public.user_activity_logs ual
LEFT JOIN public.tenants t ON ual.tenant_id = t.id
LEFT JOIN public.users u ON ual.user_id = u.id
WHERE (ual.action LIKE '%DELETE%' OR ual.action LIKE '%ADMIN%' OR ual.action = 'RESET_PASSWORD')
  AND u.role NOT IN ('owner', 'superadmin')
  AND ual.created_at >= CURRENT_DATE - INTERVAL '7 days'

ORDER BY created_at DESC;

-- Function to cleanup old activity logs
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete activity logs older than 90 days
  DELETE FROM public.user_activity_logs 
  WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete audit logs older than 1 year
  DELETE FROM public.audit_logs 
  WHERE created_at < CURRENT_DATE - INTERVAL '1 year';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant activity summary
CREATE OR REPLACE FUNCTION get_tenant_activity_summary(tenant_uuid UUID)
RETURNS TABLE (
  activity_date DATE,
  total_activities BIGINT,
  unique_users BIGINT,
  top_action TEXT,
  action_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(ual.created_at) as activity_date,
    COUNT(*) as total_activities,
    COUNT(DISTINCT ual.user_id) as unique_users,
    (
      SELECT action 
      FROM public.user_activity_logs ual2 
      WHERE ual2.tenant_id = tenant_uuid 
        AND DATE(ual2.created_at) = DATE(ual.created_at)
      GROUP BY action 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as top_action,
    (
      SELECT COUNT(*) 
      FROM public.user_activity_logs ual2 
      WHERE ual2.tenant_id = tenant_uuid 
        AND DATE(ual2.created_at) = DATE(ual.created_at)
        AND ual2.action = (
          SELECT action 
          FROM public.user_activity_logs ual3 
          WHERE ual3.tenant_id = tenant_uuid 
            AND DATE(ual3.created_at) = DATE(ual.created_at)
          GROUP BY action 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        )
    ) as action_count
  FROM public.user_activity_logs ual
  WHERE ual.tenant_id = tenant_uuid
    AND ual.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(ual.created_at)
  ORDER BY activity_date DESC;
END;
$$ LANGUAGE plpgsql;
