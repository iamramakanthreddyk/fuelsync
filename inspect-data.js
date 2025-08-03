/**
 * @file inspect-data.js
 * @description Comprehensive data inspection to understand what's in the database
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspectData() {
  console.log('🔍 COMPREHENSIVE DATA INSPECTION');
  console.log('================================\n');

  try {
    // 1. Check tenants
    console.log('1. TENANTS:');
    const tenants = await pool.query(`
      SELECT id, name, status, plan_id, created_at 
      FROM public.tenants 
      ORDER BY created_at DESC
    `);
    
    if (tenants.rows.length === 0) {
      console.log('   ❌ No tenants found');
    } else {
      console.log(`   ✅ Found ${tenants.rows.length} tenants:`);
      tenants.rows.forEach((tenant, i) => {
        console.log(`   ${i + 1}. ${tenant.name} (${tenant.status})`);
        console.log(`      ID: ${tenant.id}`);
        console.log(`      Plan ID: ${tenant.plan_id}`);
        console.log(`      Created: ${tenant.created_at}`);
        console.log('');
      });
    }

    // 2. Check plans
    console.log('2. PLANS:');
    const plans = await pool.query(`
      SELECT id, name, max_stations, max_pumps_per_station, max_nozzles_per_pump, 
             price_monthly, price_yearly, features, created_at,
             (SELECT COUNT(*) FROM public.tenants WHERE plan_id = p.id) as tenant_count
      FROM public.plans p 
      ORDER BY price_monthly ASC
    `);
    
    if (plans.rows.length === 0) {
      console.log('   ❌ No plans found');
    } else {
      console.log(`   ✅ Found ${plans.rows.length} plans:`);
      plans.rows.forEach((plan, i) => {
        console.log(`   ${i + 1}. ${plan.name}`);
        console.log(`      ID: ${plan.id}`);
        console.log(`      Price: ₹${plan.price_monthly}/month, ₹${plan.price_yearly}/year`);
        console.log(`      Limits: ${plan.max_stations} stations, ${plan.max_pumps_per_station} pumps, ${plan.max_nozzles_per_pump} nozzles`);
        console.log(`      Features: ${plan.features}`);
        console.log(`      Tenants using: ${plan.tenant_count}`);
        console.log('');
      });
    }

    // 3. Check users
    console.log('3. USERS:');
    const users = await pool.query(`
      SELECT id, email, role, tenant_id, created_at, updated_at
      FROM public.users 
      ORDER BY created_at DESC
    `);
    
    if (users.rows.length === 0) {
      console.log('   ❌ No users found');
    } else {
      console.log(`   ✅ Found ${users.rows.length} users:`);
      users.rows.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.email} (${user.role})`);
        console.log(`      ID: ${user.id}`);
        console.log(`      Tenant ID: ${user.tenant_id}`);
        console.log(`      Created: ${user.created_at}`);
        console.log('');
      });
    }

    // 4. Check admin users
    console.log('4. ADMIN USERS:');
    const adminUsers = await pool.query(`
      SELECT id, email, role, created_at
      FROM public.admin_users
      ORDER BY created_at DESC
    `);
    
    if (adminUsers.rows.length === 0) {
      console.log('   ❌ No admin users found');
    } else {
      console.log(`   ✅ Found ${adminUsers.rows.length} admin users:`);
      adminUsers.rows.forEach((admin, i) => {
        console.log(`   ${i + 1}. ${admin.email} (${admin.role})`);
        console.log(`      ID: ${admin.id}`);
        console.log(`      Created: ${admin.created_at}`);
        console.log('');
      });
    }

    // 5. Check stations
    console.log('5. STATIONS:');
    const stations = await pool.query(`
      SELECT id, name, tenant_id, created_at
      FROM public.stations 
      ORDER BY created_at DESC
    `);
    
    if (stations.rows.length === 0) {
      console.log('   ❌ No stations found');
    } else {
      console.log(`   ✅ Found ${stations.rows.length} stations:`);
      stations.rows.forEach((station, i) => {
        console.log(`   ${i + 1}. ${station.name}`);
        console.log(`      ID: ${station.id}`);
        console.log(`      Tenant ID: ${station.tenant_id}`);
        console.log('');
      });
    }

    // 6. Cross-reference data
    console.log('6. DATA CROSS-REFERENCE:');
    console.log('   Checking data consistency...');
    
    // Check if tenant plan_ids match existing plans
    for (const tenant of tenants.rows) {
      const planExists = plans.rows.find(p => p.id === tenant.plan_id);
      if (!planExists) {
        console.log(`   ⚠️  Tenant "${tenant.name}" has invalid plan_id: ${tenant.plan_id}`);
      }
    }

    // Check if users have valid tenant_ids
    for (const user of users.rows) {
      if (user.tenant_id) {
        const tenantExists = tenants.rows.find(t => t.id === user.tenant_id);
        if (!tenantExists) {
          console.log(`   ⚠️  User "${user.email}" has invalid tenant_id: ${user.tenant_id}`);
        }
      }
    }

    console.log('   ✅ Data cross-reference complete');

  } catch (error) {
    console.error('❌ Error inspecting data:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the inspection
inspectData();
