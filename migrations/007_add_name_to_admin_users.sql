-- Add name field to admin_users table
ALTER TABLE public.admin_users 
ADD COLUMN name TEXT;

-- Update existing admin users with default names based on email
UPDATE public.admin_users 
SET name = SPLIT_PART(email, '@', 1) 
WHERE name IS NULL;