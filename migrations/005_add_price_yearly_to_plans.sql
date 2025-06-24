-- Migration: 005_add_price_yearly_to_plans
-- Description: Add price_yearly column to public.plans table
-- Version: 1.0.0
-- Dependencies: 001_initial_schema

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Record migration
INSERT INTO public.schema_migrations (version, description)
VALUES ('005', 'Add price_yearly to plans')
ON CONFLICT (version) DO NOTHING;
