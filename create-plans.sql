-- Create the three standard plans
INSERT INTO public.plans (id, name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, price_yearly, features, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'starter', 1, 2, 2, 9.99, 99.99, '["basic_reports"]', NOW()),
  ('00000000-0000-0000-0000-000000000002', 'pro', 3, 4, 4, 29.99, 299.99, '["creditors", "reports", "analytics"]', NOW()),
  ('00000000-0000-0000-0000-000000000003', 'enterprise', 999, 999, 999, 99.99, 999.99, '["creditors", "reports", "analytics", "api_access", "priority_support"]', NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  max_stations = EXCLUDED.max_stations,
  max_pumps_per_station = EXCLUDED.max_pumps_per_station,
  max_nozzles_per_pump = EXCLUDED.max_nozzles_per_pump,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features;