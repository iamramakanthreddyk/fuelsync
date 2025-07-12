-- Migration: 012_add_day_reconciliation_readings
-- Description: Add missing reading fields to day_reconciliations

ALTER TABLE public.day_reconciliations
  ADD COLUMN IF NOT EXISTS opening_reading DECIMAL(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_reading DECIMAL(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variance DECIMAL(10,3) DEFAULT 0;
