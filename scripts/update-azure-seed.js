const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function updateAzureSeed() {
  console.log('Starting Azure seed update...');
  
    try {
    require('dotenv').config();
  } catch (e) {
    console.log('dotenv not available, using environment variables');
  }
  
  
  // Azure PostgreSQL connection
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user:process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false } // Required for Azure PostgreSQL
  });

  try {
    console.log('Connected to Azure database');
    console.log('Host:', process.env.POSTGRES_HOST || process.env.DB_HOST);
    console.log('Database:', process.env.POSTGRES_DATABASE || process.env.DB_NAME);
    console.log('User:', process.env.POSTGRES_USER || process.env.DB_USER);
    
    // Create SuperAdmin test data
    console.log('Creating SuperAdmin test data...');
    
    // Create test plans
    // First check if plan exists
    let basicPlanResult = await pool.query(`SELECT id FROM public.plans WHERE name = 'Basic Plan'`);
    let basicPlanId;
    
    if (basicPlanResult.rows.length > 0) {
      // Update existing plan
      basicPlanId = basicPlanResult.rows[0].id;
      await pool.query(`
        UPDATE public.plans 
        SET max_stations = 5, 
            max_pumps_per_station = 10, 
            max_nozzles_per_pump = 4, 
            price_monthly = 49.99, 
            features = '["Station Management", "Sales Tracking", "Basic Reports"]'
        WHERE id = $1
      `, [basicPlanId]);
    } else {
      // Create new plan
      basicPlanId = (await pool.query(`
        INSERT INTO public.plans (name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, features)
        VALUES ('Basic Plan', 5, 10, 4, 49.99, '["Station Management", "Sales Tracking", "Basic Reports"]')
        RETURNING id
      `)).rows[0].id;
    }
    
    // Check if Pro Plan exists
    let proPlanResult = await pool.query(`SELECT id FROM public.plans WHERE name = 'Pro Plan'`);
    let proPlanId;
    
    if (proPlanResult.rows.length > 0) {
      // Update existing plan
      proPlanId = proPlanResult.rows[0].id;
      await pool.query(`
        UPDATE public.plans 
        SET max_stations = 15, 
            max_pumps_per_station = 20, 
            max_nozzles_per_pump = 6, 
            price_monthly = 99.99, 
            features = '["Station Management", "Sales Tracking", "Advanced Reports", "API Access", "Multi-User Access"]'
        WHERE id = $1
      `, [proPlanId]);
    } else {
      // Create new plan
      proPlanId = (await pool.query(`
        INSERT INTO public.plans (name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, features)
        VALUES ('Pro Plan', 15, 20, 6, 99.99, '["Station Management", "Sales Tracking", "Advanced Reports", "API Access", "Multi-User Access"]')
        RETURNING id
      `)).rows[0].id;
    }
    
    // Check if Enterprise Plan exists
    let enterprisePlanResult = await pool.query(`SELECT id FROM public.plans WHERE name = 'Enterprise Plan'`);
    let enterprisePlanId;
    
    if (enterprisePlanResult.rows.length > 0) {
      // Update existing plan
      enterprisePlanId = enterprisePlanResult.rows[0].id;
      await pool.query(`
        UPDATE public.plans 
        SET max_stations = 50, 
            max_pumps_per_station = 30, 
            max_nozzles_per_pump = 8, 
            price_monthly = 199.99, 
            features = '["Station Management", "Sales Tracking", "Advanced Reports", "API Access", "Multi-User Access", "Priority Support", "Custom Branding", "Data Export"]'
        WHERE id = $1
      `, [enterprisePlanId]);
    } else {
      // Create new plan
      enterprisePlanId = (await pool.query(`
        INSERT INTO public.plans (name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, features)
        VALUES ('Enterprise Plan', 50, 30, 8, 199.99, '["Station Management", "Sales Tracking", "Advanced Reports", "API Access", "Multi-User Access", "Priority Support", "Custom Branding", "Data Export"]')
        RETURNING id
      `)).rows[0].id;
    }
    
    console.log('Created test plans:', { basicPlanId, proPlanId, enterprisePlanId });
    
    // Create test tenants
    const passwordHash = await bcrypt.hash('tenant123', 10);
    
    // Test Tenant 1
    const tenant1SchemaName = 'test_tenant_1';
    let tenant1Result = await pool.query(`SELECT id FROM public.tenants WHERE schema_name = $1`, [tenant1SchemaName]);
    let tenant1Id;
    
    if (tenant1Result.rows.length > 0) {
      // Update existing tenant
      tenant1Id = tenant1Result.rows[0].id;
      await pool.query(`
        UPDATE public.tenants 
        SET name = 'Test Tenant 1', 
            plan_id = $1, 
            status = 'active'
        WHERE id = $2
      `, [basicPlanId, tenant1Id]);
    } else {
      // Create new tenant
      tenant1Id = (await pool.query(`
        INSERT INTO public.tenants (name, schema_name, plan_id, status)
        VALUES ('Test Tenant 1', $1, $2, 'active')
        RETURNING id
      `, [tenant1SchemaName, basicPlanId])).rows[0].id;
    }
    
    // Test Tenant 2
    const tenant2SchemaName = 'test_tenant_2';
    let tenant2Result = await pool.query(`SELECT id FROM public.tenants WHERE schema_name = $1`, [tenant2SchemaName]);
    let tenant2Id;
    
    if (tenant2Result.rows.length > 0) {
      // Update existing tenant
      tenant2Id = tenant2Result.rows[0].id;
      await pool.query(`
        UPDATE public.tenants 
        SET name = 'Test Tenant 2', 
            plan_id = $1, 
            status = 'active'
        WHERE id = $2
      `, [proPlanId, tenant2Id]);
    } else {
      // Create new tenant
      tenant2Id = (await pool.query(`
        INSERT INTO public.tenants (name, schema_name, plan_id, status)
        VALUES ('Test Tenant 2', $1, $2, 'active')
        RETURNING id
      `, [tenant2SchemaName, proPlanId])).rows[0].id;
    }
    
    // Test Tenant 3 (suspended)
    const tenant3SchemaName = 'test_tenant_3';
    let tenant3Result = await pool.query(`SELECT id FROM public.tenants WHERE schema_name = $1`, [tenant3SchemaName]);
    let tenant3Id;
    
    if (tenant3Result.rows.length > 0) {
      // Update existing tenant
      tenant3Id = tenant3Result.rows[0].id;
      await pool.query(`
        UPDATE public.tenants 
        SET name = 'Test Tenant 3', 
            plan_id = $1, 
            status = 'suspended'
        WHERE id = $2
      `, [enterprisePlanId, tenant3Id]);
    } else {
      // Create new tenant
      tenant3Id = (await pool.query(`
        INSERT INTO public.tenants (name, schema_name, plan_id, status)
        VALUES ('Test Tenant 3', $1, $2, 'suspended')
        RETURNING id
      `, [tenant3SchemaName, enterprisePlanId])).rows[0].id;
    }
    
    console.log('Created test tenants:', { tenant1Id, tenant2Id, tenant3Id });
    
    // Create additional admin users
    const adminHash = await bcrypt.hash('admin123', 10);
    
    // Check if admin2 exists
    const admin2Result = await pool.query(`SELECT id FROM public.admin_users WHERE email = 'admin2@fuelsync.com'`);
    if (admin2Result.rows.length === 0) {
      await pool.query(`
        INSERT INTO public.admin_users (email, password_hash, role)
        VALUES ('admin2@fuelsync.com', $1, 'superadmin')
      `, [adminHash]);
    }
    
    // Check if support admin exists
    const supportResult = await pool.query(`SELECT id FROM public.admin_users WHERE email = 'support@fuelsync.com'`);
    if (supportResult.rows.length === 0) {
      await pool.query(`
        INSERT INTO public.admin_users (email, password_hash, role)
        VALUES ('support@fuelsync.com', $1, 'admin')
      `, [adminHash]);
    }
    
    console.log('Created additional admin users');
    
    console.log('SuperAdmin test data created successfully');
    console.log('Login credentials:');
    console.log('SuperAdmin: admin@fuelsync.com / admin123');
    console.log('SuperAdmin: admin2@fuelsync.com / admin123');
    console.log('Admin: support@fuelsync.com / admin123');
    
  } catch (error) {
    console.error('Error updating Azure seed:', error);
  } finally {
    await pool.end();
  }
}

updateAzureSeed().catch(console.error);