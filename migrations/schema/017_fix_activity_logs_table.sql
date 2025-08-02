-- Migration: 017_fix_activity_logs_table
-- Description: Fix user_activity_logs table structure and data types
-- Version: 1.0.0

BEGIN;

-- First, let's check if the table exists and what columns it has
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_activity_logs' AND column_name = 'action') THEN
    ALTER TABLE public.user_activity_logs ADD COLUMN action TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_activity_logs' AND column_name = 'resource') THEN
    ALTER TABLE public.user_activity_logs ADD COLUMN resource TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_activity_logs' AND column_name = 'details') THEN
    ALTER TABLE public.user_activity_logs ADD COLUMN details JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_activity_logs' AND column_name = 'created_at') THEN
    ALTER TABLE public.user_activity_logs ADD COLUMN created_at TIMESTAMPTZ;
  END IF;
END $$;

-- Update created_at from recorded_at for existing records where created_at is null
UPDATE public.user_activity_logs 
SET created_at = recorded_at 
WHERE created_at IS NULL AND recorded_at IS NOT NULL;

-- Set default for created_at
ALTER TABLE public.user_activity_logs ALTER COLUMN created_at SET DEFAULT NOW();

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_tenant_created 
ON public.user_activity_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_created 
ON public.user_activity_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action 
ON public.user_activity_logs (action, created_at DESC) WHERE action IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_resource 
ON public.user_activity_logs (resource, created_at DESC) WHERE resource IS NOT NULL;

-- Create missing report_generations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.report_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  report_type TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  format TEXT NOT NULL CHECK (format IN ('csv', 'excel', 'pdf')),
  file_size_bytes BIGINT,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
  -- Foreign keys removed to avoid Azure deployment issues
);

-- Indexes for report_generations
CREATE INDEX IF NOT EXISTS idx_report_generations_tenant_date 
ON public.report_generations (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_report_generations_type 
ON public.report_generations (report_type, created_at DESC);

-- Function to safely log user activity (handles both old and new schema)
CREATE OR REPLACE FUNCTION log_user_activity(
  p_tenant_id TEXT,
  p_user_id TEXT,
  p_action TEXT,
  p_resource TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  activity_id TEXT;
BEGIN
  -- Generate a UUID as text to match the table's text column type
  activity_id := gen_random_uuid()::text;

  INSERT INTO public.user_activity_logs (
    id, tenant_id, user_id, action, resource, details,
    ip_address, user_agent, event, recorded_at, created_at, updated_at
  ) VALUES (
    activity_id, p_tenant_id, p_user_id, p_action, p_resource, p_details,
    p_ip_address, p_user_agent, p_action, NOW(), NOW(), NOW()
  );

  RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS get_tenant_activity_summary(UUID);

-- Function to get activity summary for a tenant
CREATE OR REPLACE FUNCTION get_tenant_activity_summary(p_tenant_id TEXT)
RETURNS TABLE (
  total_activities BIGINT,
  unique_users BIGINT,
  activities_today BIGINT,
  activities_week BIGINT,
  activities_month BIGINT,
  top_action TEXT,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_activities,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE (created_at IS NOT NULL AND DATE(created_at) = CURRENT_DATE) OR (created_at IS NULL AND DATE(recorded_at) = CURRENT_DATE)) as activities_today,
    COUNT(*) FILTER (WHERE (created_at IS NOT NULL AND created_at >= CURRENT_DATE - INTERVAL '7 days') OR (created_at IS NULL AND recorded_at >= CURRENT_DATE - INTERVAL '7 days')) as activities_week,
    COUNT(*) FILTER (WHERE (created_at IS NOT NULL AND created_at >= CURRENT_DATE - INTERVAL '30 days') OR (created_at IS NULL AND recorded_at >= CURRENT_DATE - INTERVAL '30 days')) as activities_month,
    (
      SELECT COALESCE(action, event) 
      FROM public.user_activity_logs 
      WHERE tenant_id = p_tenant_id 
        AND (action IS NOT NULL OR event IS NOT NULL)
      GROUP BY COALESCE(action, event) 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as top_action,
    GREATEST(MAX(created_at), MAX(recorded_at)) as last_activity
  FROM public.user_activity_logs
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Test the function works
DO $$
DECLARE
  test_tenant_id TEXT;
  test_user_id TEXT;
  activity_id TEXT;
BEGIN
  -- Get a sample tenant and user for testing
  SELECT id::text INTO test_tenant_id FROM public.tenants LIMIT 1;
  SELECT id::text INTO test_user_id FROM public.users LIMIT 1;

  IF test_tenant_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    -- Test the logging function
    SELECT log_user_activity(
      test_tenant_id,
      test_user_id,
      'TEST_MIGRATION',
      'migration_test',
      '{"test": true}'::jsonb
    ) INTO activity_id;

    -- Clean up test record
    DELETE FROM public.user_activity_logs WHERE id = activity_id;

    RAISE NOTICE 'Activity logging function test: SUCCESS';
  ELSE
    RAISE NOTICE 'No test data available, skipping function test';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE public.user_activity_logs IS 'Tracks user activities across the system with support for both old and new schema';
COMMENT ON TABLE public.report_generations IS 'Tracks report generation for plan limits and analytics';
COMMENT ON FUNCTION log_user_activity IS 'Safely logs user activity handling both old and new table schema';
COMMENT ON FUNCTION get_tenant_activity_summary IS 'Gets activity summary for a tenant with fallback for old schema';

-- Record migration
INSERT INTO public.schema_migrations (version, description)
VALUES ('017', 'Fix user_activity_logs table structure and add report_generations table')
ON CONFLICT (version) DO NOTHING;

COMMIT;
