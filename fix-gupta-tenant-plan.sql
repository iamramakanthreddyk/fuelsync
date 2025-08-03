-- Fix Gupta tenant plan from starter to pro
-- Current tenant ID: 681ac774-7a8f-428c-a008-2ac9aca76fc0
-- Current plan ID: 2a35ec3e-29be-4b6f-b3a2-4b419363e7f7 (starter - 1 station)
-- Target plan ID: 00000000-0000-0000-0000-000000000002 (pro - 3 stations)

-- First, check current tenant status
SELECT 
    t.id,
    t.name,
    t.plan_id,
    p.name as plan_name,
    p.max_stations
FROM public.tenants t 
LEFT JOIN public.plans p ON t.plan_id = p.id 
WHERE t.id = '681ac774-7a8f-428c-a008-2ac9aca76fc0';

-- Check if pro plan exists
SELECT id, name, max_stations FROM public.plans WHERE id = '00000000-0000-0000-0000-000000000002';

-- If pro plan doesn't exist, create it
INSERT INTO public.plans (id, name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, price_yearly, features, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'pro',
    3,
    4,
    4,
    29.99,
    299.99,
    '["creditors", "reports"]',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Update Gupta tenant to pro plan
UPDATE public.tenants 
SET plan_id = '00000000-0000-0000-0000-000000000002'
WHERE id = '681ac774-7a8f-428c-a008-2ac9aca76fc0';

-- Verify the update
SELECT 
    t.id,
    t.name,
    t.plan_id,
    p.name as plan_name,
    p.max_stations,
    (SELECT COUNT(*) FROM public.stations WHERE tenant_id = t.id) as current_stations
FROM public.tenants t 
LEFT JOIN public.plans p ON t.plan_id = p.id 
WHERE t.id = '681ac774-7a8f-428c-a008-2ac9aca76fc0';