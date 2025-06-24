-- Production Database Seed Data
-- Run after 001_production_schema.sql

-- Insert basic plan
INSERT INTO public.plans (id, name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, features) 
VALUES (
    gen_random_uuid(),
    'Basic Plan',
    10,
    20,
    6,
    99.99,
    '["Station Management", "Fuel Price Tracking", "Sales Reports", "Credit Management"]'
) ON CONFLICT DO NOTHING;

-- Insert production tenant
INSERT INTO public.tenants (id, name, schema_name, plan_id) 
VALUES (
    gen_random_uuid(),
    'FuelSync Production',
    'production_tenant',
    (SELECT id FROM public.plans WHERE name = 'Basic Plan' LIMIT 1)
) ON CONFLICT (schema_name) DO NOTHING;

-- Insert super admin user
INSERT INTO public.admin_users (email, password_hash, role) 
VALUES (
    'admin@fuelsync.com',
    '$2b$10$rQZ8kHp4rQZ8kHp4rQZ8kOtGvC4kHp4rQZ8kHp4rQZ8kHp4rQZ8kO', -- password: admin123
    'superadmin'
) ON CONFLICT (email) DO NOTHING;

-- Get tenant ID for production tenant
DO $$
DECLARE
    tenant_uuid UUID;
BEGIN
    SELECT id INTO tenant_uuid FROM public.tenants WHERE schema_name = 'production_tenant';
    
    -- Insert production tenant users
    INSERT INTO production_tenant.users (tenant_id, email, password_hash, name, role) VALUES
    (tenant_uuid, 'owner@fuelsync.com', '$2b$10$rQZ8kHp4rQZ8kHp4rQZ8kOtGvC4kHp4rQZ8kHp4rQZ8kHp4rQZ8kO', 'Station Owner', 'owner'),
    (tenant_uuid, 'manager@fuelsync.com', '$2b$10$rQZ8kHp4rQZ8kHp4rQZ8kOtGvC4kHp4rQZ8kHp4rQZ8kHp4rQZ8kO', 'Station Manager', 'manager'),
    (tenant_uuid, 'attendant@fuelsync.com', '$2b$10$rQZ8kHp4rQZ8kHp4rQZ8kHp4rQZ8kHp4rQZ8kHp4rQZ8kHp4rQZ8kO', 'Pump Attendant', 'attendant')
    ON CONFLICT (email) DO NOTHING;
    
    -- Insert sample station
    INSERT INTO production_tenant.stations (tenant_id, name, address, status) VALUES
    (tenant_uuid, 'Main Station', '123 Highway Road, City', 'active')
    ON CONFLICT DO NOTHING;
    
    -- Insert sample pumps
    INSERT INTO production_tenant.pumps (tenant_id, station_id, label, serial_number, status) VALUES
    (tenant_uuid, (SELECT id FROM production_tenant.stations WHERE name = 'Main Station' LIMIT 1), 'Pump 1', 'P001-2024', 'active'),
    (tenant_uuid, (SELECT id FROM production_tenant.stations WHERE name = 'Main Station' LIMIT 1), 'Pump 2', 'P002-2024', 'active')
    ON CONFLICT DO NOTHING;
    
    -- Insert sample nozzles
    INSERT INTO production_tenant.nozzles (tenant_id, pump_id, nozzle_number, fuel_type, status) VALUES
    (tenant_uuid, (SELECT id FROM production_tenant.pumps WHERE label = 'Pump 1' LIMIT 1), 1, 'petrol', 'active'),
    (tenant_uuid, (SELECT id FROM production_tenant.pumps WHERE label = 'Pump 1' LIMIT 1), 2, 'diesel', 'active'),
    (tenant_uuid, (SELECT id FROM production_tenant.pumps WHERE label = 'Pump 2' LIMIT 1), 1, 'petrol', 'active'),
    (tenant_uuid, (SELECT id FROM production_tenant.pumps WHERE label = 'Pump 2' LIMIT 1), 2, 'premium', 'active')
    ON CONFLICT DO NOTHING;
    
    -- Insert sample fuel prices
    INSERT INTO production_tenant.fuel_prices (tenant_id, station_id, fuel_type, price) VALUES
    (tenant_uuid, (SELECT id FROM production_tenant.stations WHERE name = 'Main Station' LIMIT 1), 'petrol', 95.50),
    (tenant_uuid, (SELECT id FROM production_tenant.stations WHERE name = 'Main Station' LIMIT 1), 'diesel', 87.25),
    (tenant_uuid, (SELECT id FROM production_tenant.stations WHERE name = 'Main Station' LIMIT 1), 'premium', 105.75)
    ON CONFLICT DO NOTHING;
    
    -- Insert sample creditors
    INSERT INTO production_tenant.creditors (tenant_id, party_name, contact_number, credit_limit, status) VALUES
    (tenant_uuid, 'ABC Transport Co.', '+1234567890', 50000.00, 'active'),
    (tenant_uuid, 'XYZ Logistics', '+0987654321', 25000.00, 'active'),
    (tenant_uuid, 'City Bus Service', '+1122334455', 75000.00, 'active')
    ON CONFLICT DO NOTHING;
    
    -- Insert sample nozzle readings
    INSERT INTO production_tenant.nozzle_readings (tenant_id, nozzle_id, reading, recorded_at, payment_method) VALUES
    (tenant_uuid, (SELECT id FROM production_tenant.nozzles WHERE nozzle_number = 1 AND fuel_type = 'petrol' LIMIT 1), 1000.000, NOW() - INTERVAL '1 day', 'cash'),
    (tenant_uuid, (SELECT id FROM production_tenant.nozzles WHERE nozzle_number = 2 AND fuel_type = 'diesel' LIMIT 1), 800.000, NOW() - INTERVAL '1 day', 'cash'),
    (tenant_uuid, (SELECT id FROM production_tenant.nozzles WHERE nozzle_number = 1 AND fuel_type = 'petrol' LIMIT 1), 1050.500, NOW() - INTERVAL '12 hours', 'credit'),
    (tenant_uuid, (SELECT id FROM production_tenant.nozzles WHERE nozzle_number = 2 AND fuel_type = 'diesel' LIMIT 1), 825.750, NOW() - INTERVAL '6 hours', 'cash')
    ON CONFLICT DO NOTHING;
    
    -- Insert sample sales (matching the readings)
    INSERT INTO production_tenant.sales (tenant_id, nozzle_id, station_id, volume, fuel_type, fuel_price, amount, payment_method, recorded_at) VALUES
    (tenant_uuid, (SELECT id FROM production_tenant.nozzles WHERE nozzle_number = 1 AND fuel_type = 'petrol' LIMIT 1), (SELECT id FROM production_tenant.stations WHERE name = 'Main Station' LIMIT 1), 50.500, 'petrol', 95.50, 4822.75, 'credit', NOW() - INTERVAL '12 hours'),
    (tenant_uuid, (SELECT id FROM production_tenant.nozzles WHERE nozzle_number = 2 AND fuel_type = 'diesel' LIMIT 1), (SELECT id FROM production_tenant.stations WHERE name = 'Main Station' LIMIT 1), 25.750, 'diesel', 87.25, 2246.69, 'cash', NOW() - INTERVAL '6 hours')
    ON CONFLICT DO NOTHING;
    
    -- Insert sample credit payments
    INSERT INTO production_tenant.credit_payments (tenant_id, creditor_id, amount, payment_method, reference_number, notes) VALUES
    (tenant_uuid, (SELECT id FROM production_tenant.creditors WHERE party_name = 'ABC Transport Co.' LIMIT 1), 10000.00, 'bank_transfer', 'TXN123456', 'Monthly payment'),
    (tenant_uuid, (SELECT id FROM production_tenant.creditors WHERE party_name = 'XYZ Logistics' LIMIT 1), 5000.00, 'cash', NULL, 'Partial payment')
    ON CONFLICT DO NOTHING;
    
END $$;