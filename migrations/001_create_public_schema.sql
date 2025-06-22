-- Migration: create public schema tables
-- UUIDs are generated in the application layer

CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    config_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    schema_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    plan_id UUID REFERENCES public.plans(id)
);

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY,
    admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
