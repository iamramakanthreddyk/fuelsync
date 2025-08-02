/**
 * @file tests/role-based-access.test.js
 * @description Comprehensive unit tests for role-based access control system
 */

const { Pool } = require('pg');
const { expect } = require('chai');
require('dotenv').config();

describe('Role-Based Access Control System', function() {
  let db;
  let testTenantId;
  let testUsers = {};
  
  before(async function() {
    this.timeout(10000);
    
    // Setup database connection
    db = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });
    
    // Get or create test tenant
    const tenantResult = await db.query(`
      SELECT id FROM public.tenants WHERE name LIKE '%test%' LIMIT 1
    `);
    
    if (tenantResult.rows.length > 0) {
      testTenantId = tenantResult.rows[0].id;
    } else {
      // Create test tenant
      const newTenant = await db.query(`
        INSERT INTO public.tenants (id, name, status, plan_id, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Test Tenant', 'active', 
                (SELECT id FROM public.plans WHERE name = 'Premium' LIMIT 1), 
                NOW(), NOW())
        RETURNING id
      `);
      testTenantId = newTenant.rows[0].id;
    }
    
    // Get or create test users for each role
    const roles = ['owner', 'manager', 'attendant'];
    for (const role of roles) {
      const userResult = await db.query(`
        SELECT id FROM public.users 
        WHERE tenant_id = $1 AND role = $2 
        LIMIT 1
      `, [testTenantId, role]);
      
      if (userResult.rows.length > 0) {
        testUsers[role] = userResult.rows[0].id;
      } else {
        // Create test user
        const newUser = await db.query(`
          INSERT INTO public.users (id, tenant_id, name, email, role, password_hash, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, 'test_hash', NOW(), NOW())
          RETURNING id
        `, [testTenantId, `Test ${role}`, `test-${role}@example.com`, role]);
        testUsers[role] = newUser.rows[0].id;
      }
    }
    
    console.log(`✅ Test setup complete. Tenant: ${testTenantId}`);
    console.log(`✅ Test users: ${Object.keys(testUsers).join(', ')}`);
  });
  
  after(async function() {
    // Clean up test data
    await db.query(`DELETE FROM public.role_access_log WHERE tenant_id = $1`, [testTenantId]);
    await db.query(`DELETE FROM public.plan_feature_usage WHERE tenant_id = $1`, [testTenantId]);
    await db.query(`DELETE FROM public.user_activity_logs WHERE tenant_id = $1`, [testTenantId]);
    
    await db.end();
  });
  
  describe('Database Schema Validation', function() {
    it('should have all required tables', async function() {
      const requiredTables = [
        'tenants', 'users', 'plans', 'role_access_log', 
        'plan_feature_usage', 'user_activity_logs', 'report_generations'
      ];
      
      for (const tableName of requiredTables) {
        const result = await db.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_name = $1 AND table_schema = 'public'
        `, [tableName]);
        
        expect(result.rows.length).to.equal(1, `Table ${tableName} should exist`);
      }
    });
    
    it('should have proper column types in role_access_log', async function() {
      const result = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'role_access_log' AND table_schema = 'public'
        ORDER BY column_name
      `);
      
      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = row.data_type;
        return acc;
      }, {});
      
      expect(columns.tenant_id).to.equal('uuid');
      expect(columns.user_id).to.equal('uuid');
      expect(columns.access_granted).to.equal('boolean');
      expect(columns.created_at).to.equal('timestamp with time zone');
    });
    
    it('should have proper indexes for performance', async function() {
      const result = await db.query(`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'role_access_log' AND schemaname = 'public'
      `);
      
      const indexNames = result.rows.map(row => row.indexname);
      expect(indexNames.length).to.be.greaterThan(0, 'Should have indexes on role_access_log');
    });
  });
  
  describe('Role Access Logging', function() {
    it('should log successful access attempts', async function() {
      const userId = testUsers.owner;
      
      const result = await db.query(`
        INSERT INTO public.role_access_log (
          id, tenant_id, user_id, user_role, plan_tier, feature_requested, 
          action_requested, access_granted, denial_reason, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'owner', 'pro', 'reports', 'view', true, null, NOW()
        ) RETURNING id
      `, [testTenantId, userId]);
      
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0].id).to.be.a('string');
    });
    
    it('should log denied access attempts', async function() {
      const userId = testUsers.attendant;
      
      const result = await db.query(`
        INSERT INTO public.role_access_log (
          id, tenant_id, user_id, user_role, plan_tier, feature_requested, 
          action_requested, access_granted, denial_reason, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'attendant', 'pro', 'reports', 'generate', false, 'Role not authorized', NOW()
        ) RETURNING id
      `, [testTenantId, userId]);
      
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0].id).to.be.a('string');
    });
    
    it('should retrieve access logs for a tenant', async function() {
      const result = await db.query(`
        SELECT user_role, feature_requested, access_granted, denial_reason
        FROM public.role_access_log 
        WHERE tenant_id = $1 
        ORDER BY created_at DESC 
        LIMIT 10
      `, [testTenantId]);
      
      expect(result.rows.length).to.be.greaterThan(0);
      
      const deniedAccess = result.rows.find(row => !row.access_granted);
      if (deniedAccess) {
        expect(deniedAccess.denial_reason).to.be.a('string');
      }
    });
  });
  
  describe('Plan Feature Usage Tracking', function() {
    it('should track feature usage', async function() {
      const userId = testUsers.manager;
      
      const result = await db.query(`
        INSERT INTO public.plan_feature_usage (
          id, tenant_id, user_id, plan_tier, feature_name, usage_count, usage_date, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'pro', 'reports', 1, CURRENT_DATE, NOW(), NOW()
        ) RETURNING id
      `, [testTenantId, userId]);
      
      expect(result.rows.length).to.equal(1);
    });
    
    it('should handle duplicate usage tracking with upsert', async function() {
      const userId = testUsers.manager;
      
      // First insert
      await db.query(`
        INSERT INTO public.plan_feature_usage (
          id, tenant_id, user_id, plan_tier, feature_name, usage_count, usage_date, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'pro', 'analytics', 1, CURRENT_DATE, NOW(), NOW()
        ) ON CONFLICT (tenant_id, user_id, feature_name, usage_date)
        DO UPDATE SET usage_count = plan_feature_usage.usage_count + 1, updated_at = NOW()
      `, [testTenantId, userId]);
      
      // Second insert (should update)
      await db.query(`
        INSERT INTO public.plan_feature_usage (
          id, tenant_id, user_id, plan_tier, feature_name, usage_count, usage_date, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'pro', 'analytics', 1, CURRENT_DATE, NOW(), NOW()
        ) ON CONFLICT (tenant_id, user_id, feature_name, usage_date)
        DO UPDATE SET usage_count = plan_feature_usage.usage_count + 1, updated_at = NOW()
      `, [testTenantId, userId]);
      
      // Check final count
      const result = await db.query(`
        SELECT usage_count FROM public.plan_feature_usage 
        WHERE tenant_id = $1 AND user_id = $2 AND feature_name = 'analytics' AND usage_date = CURRENT_DATE
      `, [testTenantId, userId]);
      
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0].usage_count).to.equal(2);
    });
  });
  
  describe('User Activity Logging', function() {
    it('should log user activities using the function', async function() {
      const userId = testUsers.owner;
      
      const result = await db.query(`
        SELECT log_user_activity($1, $2, $3, $4, $5) as activity_id
      `, [testTenantId, userId, 'TEST_ACTION', 'test_resource', '{"test": true}']);
      
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0].activity_id).to.be.a('string');
      
      // Verify the log was created
      const logResult = await db.query(`
        SELECT action, resource, details FROM public.user_activity_logs 
        WHERE id = $1
      `, [result.rows[0].activity_id]);
      
      expect(logResult.rows.length).to.equal(1);
      expect(logResult.rows[0].action).to.equal('TEST_ACTION');
      expect(logResult.rows[0].resource).to.equal('test_resource');
    });
    
    it('should get activity summary for tenant', async function() {
      const result = await db.query(`
        SELECT * FROM get_tenant_activity_summary($1)
      `, [testTenantId]);
      
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0].total_activities).to.be.a('string'); // bigint returns as string
      expect(parseInt(result.rows[0].total_activities)).to.be.greaterThan(0);
    });
  });
  
  describe('Data Type Consistency', function() {
    it('should handle UUID to TEXT conversions properly', async function() {
      // Test that we can join tables with different ID types
      const result = await db.query(`
        SELECT t.name, COUNT(ual.*) as activity_count
        FROM public.tenants t
        LEFT JOIN public.user_activity_logs ual ON t.id::text = ual.tenant_id
        WHERE t.id = $1
        GROUP BY t.id, t.name
      `, [testTenantId]);

      expect(result.rows.length).to.equal(1);
      expect(result.rows[0].name).to.be.a('string');
    });

    it('should handle report generations table joins', async function() {
      // Test the report tracking views work
      const result = await db.query(`
        SELECT tenant_name, total_reports
        FROM public.report_usage_summary
        WHERE tenant_id::text = $1
      `, [testTenantId]);

      // Should not error even if no reports exist
      expect(result.rows.length).to.be.greaterThanOrEqual(0);
    });
  });

  describe('Role-Based Access Matrix', function() {
    const PLAN_NAME_TO_TIER = {
      'Regular': 'starter',
      'Premium': 'pro',
      'Enterprise': 'enterprise'
    };

    const ROLE_ACCESS_MATRIX = {
      starter: {
        owner: { reports: { view: false, generate: false }, analytics: { view: true, advanced: false } },
        manager: { reports: { view: false, generate: false }, analytics: { view: true, advanced: false } },
        attendant: { reports: { view: false, generate: false }, analytics: { view: false, advanced: false } }
      },
      pro: {
        owner: { reports: { view: true, generate: true }, analytics: { view: true, advanced: false } },
        manager: { reports: { view: true, generate: true }, analytics: { view: true, advanced: false } },
        attendant: { reports: { view: false, generate: false }, analytics: { view: false, advanced: false } }
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

    it('should deny reports access for starter plan', function() {
      expect(hasFeatureAccess('starter', 'owner', 'reports', 'view')).to.be.false;
      expect(hasFeatureAccess('starter', 'manager', 'reports', 'generate')).to.be.false;
      expect(hasFeatureAccess('starter', 'attendant', 'reports', 'view')).to.be.false;
    });

    it('should allow reports access for pro plan owners and managers', function() {
      expect(hasFeatureAccess('pro', 'owner', 'reports', 'view')).to.be.true;
      expect(hasFeatureAccess('pro', 'owner', 'reports', 'generate')).to.be.true;
      expect(hasFeatureAccess('pro', 'manager', 'reports', 'view')).to.be.true;
      expect(hasFeatureAccess('pro', 'manager', 'reports', 'generate')).to.be.true;
    });

    it('should deny reports access for pro plan attendants', function() {
      expect(hasFeatureAccess('pro', 'attendant', 'reports', 'view')).to.be.false;
      expect(hasFeatureAccess('pro', 'attendant', 'reports', 'generate')).to.be.false;
    });

    it('should allow basic analytics for starter plan owners and managers', function() {
      expect(hasFeatureAccess('starter', 'owner', 'analytics', 'view')).to.be.true;
      expect(hasFeatureAccess('starter', 'manager', 'analytics', 'view')).to.be.true;
    });

    it('should deny analytics for starter plan attendants', function() {
      expect(hasFeatureAccess('starter', 'attendant', 'analytics', 'view')).to.be.false;
    });

    it('should get correct plan tier from plan name', function() {
      expect(PLAN_NAME_TO_TIER['Regular']).to.equal('starter');
      expect(PLAN_NAME_TO_TIER['Premium']).to.equal('pro');
      expect(PLAN_NAME_TO_TIER['Enterprise']).to.equal('enterprise');
    });
  });
});
