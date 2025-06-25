-- Add deleted_at column to tenants table for soft delete functionality
ALTER TABLE public.tenants 
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Add index for filtering out deleted tenants
CREATE INDEX idx_tenants_status_deleted_at ON public.tenants(status, deleted_at);

-- Update existing queries to exclude deleted tenants by default
COMMENT ON COLUMN public.tenants.deleted_at IS 'Timestamp when tenant was soft deleted. NULL means active.';