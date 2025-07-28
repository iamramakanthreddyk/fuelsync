-- Migration: 014_update_reconciliation_diff_uuid
-- Description: Change reconciliation_diff id fields to UUID

BEGIN;

ALTER TABLE public.reconciliation_diff
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid,
  ALTER COLUMN station_id TYPE UUID USING station_id::uuid,
  ALTER COLUMN cash_report_id TYPE UUID USING cash_report_id::uuid,
  ALTER COLUMN reconciliation_id TYPE UUID USING reconciliation_id::uuid;

INSERT INTO public.schema_migrations (version, description)
VALUES ('014', 'Alter reconciliation_diff columns to UUID')
ON CONFLICT (version) DO NOTHING;

COMMIT;
