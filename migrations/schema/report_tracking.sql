-- Report generation tracking table for plan limits (skip if already exists from migration 017)
-- CREATE TABLE IF NOT EXISTS public.report_generations (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   tenant_id UUID NOT NULL,
--   report_type TEXT NOT NULL,
--   record_count INTEGER NOT NULL DEFAULT 0,
--   format TEXT NOT NULL CHECK (format IN ('csv', 'excel', 'pdf')),
--   file_size_bytes BIGINT,
--   generation_time_ms INTEGER,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   created_by UUID
--   -- Foreign keys removed to avoid Azure deployment issues
-- );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_generations_tenant_date
ON public.report_generations (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_report_generations_type 
ON public.report_generations (report_type, created_at DESC);

-- Cleanup old tracking data (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_report_generations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.report_generations 
  WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-report-generations', '0 2 * * *', 'SELECT cleanup_old_report_generations();');

-- Report usage statistics view
CREATE OR REPLACE VIEW public.report_usage_stats AS
SELECT 
  t.name as tenant_name,
  t.id as tenant_id,
  p.name as plan_name,
  COUNT(*) as total_reports,
  COUNT(*) FILTER (WHERE DATE(rg.created_at) = CURRENT_DATE) as today_reports,
  COUNT(*) FILTER (WHERE rg.created_at >= CURRENT_DATE - INTERVAL '7 days') as week_reports,
  COUNT(*) FILTER (WHERE rg.created_at >= CURRENT_DATE - INTERVAL '30 days') as month_reports,
  AVG(rg.record_count) as avg_records_per_report,
  SUM(rg.file_size_bytes) as total_file_size_bytes,
  AVG(rg.generation_time_ms) as avg_generation_time_ms
FROM public.tenants t
LEFT JOIN public.plans p ON t.plan_id = p.id
LEFT JOIN public.report_generations rg ON t.id::text = rg.tenant_id::text
WHERE t.status = 'active'
GROUP BY t.id, t.name, p.name
ORDER BY total_reports DESC;

-- Plan limits monitoring view
CREATE OR REPLACE VIEW public.plan_limits_status AS
SELECT 
  t.name as tenant_name,
  t.id as tenant_id,
  p.name as plan_name,
  p.max_stations,
  (SELECT COUNT(*) FROM public.stations WHERE tenant_id::text = t.id::text) as current_stations,
  COUNT(rg.*) FILTER (WHERE DATE(rg.created_at) = CURRENT_DATE) as today_reports,
  CASE 
    WHEN p.name ILIKE '%starter%' THEN 0
    WHEN p.name ILIKE '%pro%' THEN 10
    WHEN p.name ILIKE '%enterprise%' THEN 100
    ELSE 5
  END as daily_report_limit,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.stations WHERE tenant_id::text = t.id::text) >= p.max_stations
    THEN 'STATION_LIMIT_REACHED'
    WHEN COUNT(rg.*) FILTER (WHERE DATE(rg.created_at) = CURRENT_DATE) >= 
         CASE 
           WHEN p.name ILIKE '%starter%' THEN 0
           WHEN p.name ILIKE '%pro%' THEN 10
           WHEN p.name ILIKE '%enterprise%' THEN 100
           ELSE 5
         END
    THEN 'DAILY_REPORT_LIMIT_REACHED'
    ELSE 'OK'
  END as status
FROM public.tenants t
LEFT JOIN public.plans p ON t.plan_id = p.id
LEFT JOIN public.report_generations rg ON t.id::text = rg.tenant_id::text
WHERE t.status = 'active'
GROUP BY t.id, t.name, p.id, p.name, p.max_stations
ORDER BY t.name;
