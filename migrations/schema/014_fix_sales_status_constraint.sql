-- Fix sales status constraint to include 'voided' status
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS chk_sales_status;

ALTER TABLE public.sales 
ADD CONSTRAINT chk_sales_status 
CHECK (status IN ('pending', 'posted', 'finalized', 'voided'));