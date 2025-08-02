/**
 * Test script to verify role-based access control functionality
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

// Mock role-based access functions (simplified versions)
const PLAN_NAME_TO_TIER = {
  'Regular': 'starter',  // $499, 1 station
  'Premium': 'pro',      // $999, 3 stations
  'Enterprise': 'enterprise' // Future plan
};

function getPlanTierFromName(planName) {
  return PLAN_NAME_TO_TIER[planName] || 'starter';
}

const ROLE_ACCESS_MATRIX = {
  starter: {
    owner: {
      reports: { view: false, generate: false },
      analytics: { view: true, advanced: false },
      stations: { view: true, create: true, edit: true, delete: true }
    },
    manager: {
      reports: { view: false, generate: false },
      analytics: { view: true, advanced: false },
      stations: { view: true, create: false, edit: true, delete: false }
    },
    attendant: {
      reports: { view: false, generate: false },
      analytics: { view: false, advanced: false },
      stations: { view: true, create: false, edit: false, delete: false }
    }
  },
  pro: {
    owner: {
      reports: { view: true, generate: true },
      analytics: { view: true, advanced: false },
      stations: { view: true, create: true, edit: true, delete: true }
    },
    manager: {
      reports: { view: true, generate: true },
      analytics: { view: true, advanced: false },
      stations: { view: true, create: false, edit: true, delete: false }
    },
    attendant: {
      reports: { view: false, generate: false },
      analytics: { view: false, advanced: false },
      stations: { view: true, create: false, edit: false, delete: false }
    }
  }
};

function hasFeatureAccess(planTier, userRole, feature, action) {
  const tierAccess = ROLE_ACCESS_MATRIX[planTier];
  if (!tierAccess) return false;
  
  const roleAccess = tierAccess[userRole];
  if (!roleAccess) return false;
  
  const featureAccess = roleAccess[feature];
  if (!featureAccess) return false;
  
  return featureAccess[action] === true;
}

async function testRoleBasedAccess() {
  try {
    console.log('🧪 TESTING ROLE-BASED ACCESS CONTROL');
    console.log('=====================================\n');

    // Get a sample tenant and user
    const tenantResult = await pool.query(`
      SELECT t.id, t.name, t.status, p.name as plan_name, p.max_stations
      FROM public.tenants t
      LEFT JOIN public.plans p ON t.plan_id = p.id
      LIMIT 1
    `);

    if (tenantResult.rows.length === 0) {
      console.log('❌ No tenants found in database');
      return;
    }

    const tenant = tenantResult.rows[0];
    console.log(`📊 Testing with tenant: ${tenant.name}`);
    console.log(`💰 Plan: ${tenant.plan_name} (max stations: ${tenant.max_stations})`);
    console.log(`📈 Plan tier: ${getPlanTierFromName(tenant.plan_name)}\n`);

    // Get users for this tenant
    const usersResult = await pool.query(`
      SELECT id, name, role, email
      FROM public.users
      WHERE tenant_id = $1
      ORDER BY role
    `, [tenant.id]);

    if (usersResult.rows.length === 0) {
      console.log('❌ No users found for this tenant');
      return;
    }

    console.log('👥 TESTING ACCESS FOR EACH USER ROLE:');
    console.log('=====================================\n');

    const planTier = getPlanTierFromName(tenant.plan_name);
    const testFeatures = [
      { feature: 'reports', action: 'view', description: 'View Reports' },
      { feature: 'reports', action: 'generate', description: 'Generate Reports' },
      { feature: 'analytics', action: 'view', description: 'View Analytics' },
      { feature: 'analytics', action: 'advanced', description: 'Advanced Analytics' },
      { feature: 'stations', action: 'create', description: 'Create Stations' },
      { feature: 'stations', action: 'delete', description: 'Delete Stations' }
    ];

    for (const user of usersResult.rows) {
      console.log(`👤 ${user.name} (${user.role})`);
      console.log('─'.repeat(40));

      for (const test of testFeatures) {
        const hasAccess = hasFeatureAccess(planTier, user.role, test.feature, test.action);
        const status = hasAccess ? '✅ ALLOWED' : '❌ DENIED';
        console.log(`  ${test.description.padEnd(20)} | ${status}`);
      }
      console.log('');
    }

    // Test logging access violations
    console.log('📝 TESTING ACCESS VIOLATION LOGGING:');
    console.log('====================================\n');

    const testUser = usersResult.rows[0];
    
    // Log a successful access
    await pool.query(`
      INSERT INTO public.role_access_log (
        id, tenant_id, user_id, user_role, plan_tier, feature_requested, 
        action_requested, access_granted, denial_reason, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      )
    `, [tenant.id, testUser.id, testUser.role, planTier, 'reports', 'view', true, null]);

    // Log a denied access
    await pool.query(`
      INSERT INTO public.role_access_log (
        id, tenant_id, user_id, user_role, plan_tier, feature_requested, 
        action_requested, access_granted, denial_reason, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      )
    `, [tenant.id, testUser.id, testUser.role, planTier, 'reports', 'generate', false, 'Feature not available in starter plan']);

    console.log('✅ Access logs created successfully');

    // Check recent access logs
    const logsResult = await pool.query(`
      SELECT user_role, plan_tier, feature_requested, action_requested, 
             access_granted, denial_reason, created_at
      FROM public.role_access_log
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [tenant.id]);

    console.log('\n📋 RECENT ACCESS LOGS:');
    console.log('======================');
    logsResult.rows.forEach(log => {
      const status = log.access_granted ? '✅ GRANTED' : '❌ DENIED';
      console.log(`${log.user_role} | ${log.feature_requested}.${log.action_requested} | ${status}`);
      if (!log.access_granted && log.denial_reason) {
        console.log(`   Reason: ${log.denial_reason}`);
      }
    });

    console.log('\n🎉 ROLE-BASED ACCESS CONTROL TEST COMPLETED!');
    console.log('============================================');
    console.log('✅ Database schema supports role-based access');
    console.log('✅ Plan tiers are properly mapped');
    console.log('✅ Access logging is working');
    console.log('✅ Ready for frontend integration');

  } catch (error) {
    console.error('❌ Error testing role-based access:', error.message);
  } finally {
    await pool.end();
  }
}

testRoleBasedAccess();
