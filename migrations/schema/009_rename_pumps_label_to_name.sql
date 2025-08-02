-- Migration: 009_rename_pumps_label_to_name
-- Description: Rename column label to name in pumps table

BEGIN;

-- Rename label to name if label column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'pumps' AND column_name = 'label') THEN
        ALTER TABLE public.pumps RENAME COLUMN label TO name;
    END IF;
END $$;

INSERT INTO public.schema_migrations (version, description)
VALUES ('009', 'Rename pumps.label to name')
ON CONFLICT (version) DO NOTHING;

COMMIT;
