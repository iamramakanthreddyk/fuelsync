/**
 * @file tests/comprehensive-user-journey.test.js
 * @description Comprehensive user journey tests for all roles and endpoints
 */

const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000/api/v1';
const TEST_TIMEOUT = 30000;

// Test data structure
const testData = {
  tenants: {},
  users: {},
  tokens: {},
  stations: {},
  pumps: {},
  nozzles: {},
  readings: {}
};

// Role-based access matrix for validation
const ROLE_ACCESS_MATRIX = {
  starter: {
    owner: {
      stations: { view: true, create: true, edit: true, delete: false },
      users: { view: true, create: true, edit: true, delete: false },
      reports: { view: false, generate: false },
      analytics: { view: false, advanced: false },
      creditors: { view: false, create: false }
    },
    manager: {
      stations: { view: true, create: false, edit: true, delete: false },
      users: { view: true, create: false, edit: false, delete: false },
      reports: { view: false, generate: false },
      analytics: { view: false, advanced: false },
      creditors: { view: false, create: false }
    },
    attendant: {
      stations: { view: true, create: false, edit: false, delete: false },
      users: { view: false, create: false, edit: false, delete: false },
      reports: { view: false, generate: false },
      analytics: { view: false, advanced: false },
      creditors: { view: false, create: false }
    }
  },
  pro: {
    owner: {
      stations: { view: true, create: true, edit: true, delete: true },
      users: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, generate: true },
      analytics: { view: true, advanced: false },
      creditors: { view: true, create: true }
    },
    manager: {
      stations: { view: true, create: true, edit: true, delete: false },
      users: { view: true, create: true, edit: true, delete: false },
      reports: { view: true, generate: true },
      analytics: { view: true, advanced: false },
      creditors: { view: true, create: true }
    },
    attendant: {
      stations: { view: true, create: false, edit: false, delete: false },
      users: { view: false, create: false, edit: false, delete: false },
      reports: { view: false, generate: false },
      analytics: { view: false, advanced: false },
      creditors: { view: true, create: false }
    }
  }
};

class UserJourneyTester {
  constructor() {
    this.db = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async setup() {
    console.log('🔧 Setting up comprehensive user journey tests...\n');
    
    // Setup database connection
    this.db = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    // Create test tenants with different plans
    await this.createTestTenants();
    await this.createTestUsers();
    
    console.log('✅ Test setup complete\n');
  }

  async createTestTenants() {
    // Create starter plan tenant
    const starterTenant = await this.db.query(`
      INSERT INTO public.tenants (id, name, status, plan_id, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Test Starter Tenant', 'active', 
              (SELECT id FROM public.plans WHERE name = 'Regular' LIMIT 1), 
              NOW(), NOW())
      RETURNING id, name
    `);
    testData.tenants.starter = starterTenant.rows[0];

    // Create pro plan tenant
    const proTenant = await this.db.query(`
      INSERT INTO public.tenants (id, name, status, plan_id, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Test Pro Tenant', 'active', 
              (SELECT id FROM public.plans WHERE name = 'Premium' LIMIT 1), 
              NOW(), NOW())
      RETURNING id, name
    `);
    testData.tenants.pro = proTenant.rows[0];

    console.log(`📊 Created test tenants: ${testData.tenants.starter.name}, ${testData.tenants.pro.name}`);
  }

  async createTestUsers() {
    const roles = ['owner', 'manager', 'attendant'];
    const plans = ['starter', 'pro'];

    for (const plan of plans) {
      testData.users[plan] = {};
      for (const role of roles) {
        const user = await this.db.query(`
          INSERT INTO public.users (id, tenant_id, name, email, role, password_hash, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, '$2b$10$test.hash.for.testing', NOW(), NOW())
          RETURNING id, name, email, role
        `, [
          testData.tenants[plan].id,
          `Test ${plan} ${role}`,
          `test-${plan}-${role}@example.com`,
          role
        ]);
        testData.users[plan][role] = user.rows[0];
      }
    }

    console.log('👥 Created test users for all roles and plans');
  }

  async authenticateUser(plan, role) {
    // For comprehensive testing, we'll use the database to get real users
    // and create JWT tokens manually for testing
    const user = testData.users[plan][role];
    const tenant = testData.tenants[plan];

    // Create a test JWT token (simplified for testing)
    const mockToken = Buffer.from(JSON.stringify({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
      name: user.name
    })).toString('base64');

    testData.tokens[`${plan}_${role}`] = mockToken;
    return mockToken;
  }

  async testEndpoint(method, endpoint, data, token, expectedStatus, testName) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: TEST_TIMEOUT
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
      }

      const response = await axios(config);
      
      const passed = response.status === expectedStatus;
      this.recordTest(testName, passed, response.status, expectedStatus);
      
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      const actualStatus = error.response?.status || 500;
      const passed = actualStatus === expectedStatus;
      this.recordTest(testName, passed, actualStatus, expectedStatus);
      
      return { 
        success: false, 
        error: error.message, 
        status: actualStatus,
        data: error.response?.data 
      };
    }
  }

  recordTest(name, passed, actualStatus, expectedStatus) {
    this.testResults.tests.push({
      name,
      passed,
      actualStatus,
      expectedStatus
    });
    
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${name}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${name} (Expected: ${expectedStatus}, Got: ${actualStatus})`);
    }
  }

  async runOwnerJourneyTests(plan) {
    console.log(`\n👑 TESTING OWNER JOURNEY - ${plan.toUpperCase()} PLAN`);
    console.log('='.repeat(60));

    const token = await this.authenticateUser(plan, 'owner');
    const access = ROLE_ACCESS_MATRIX[plan].owner;

    // Test Dashboard Access
    await this.testEndpoint('GET', '/dashboard', null, token, 200, 
      `${plan} Owner: Dashboard access`);

    // Test Station Management
    if (access.stations.view) {
      await this.testEndpoint('GET', '/stations', null, token, 200, 
        `${plan} Owner: View stations`);
    }

    if (access.stations.create) {
      const stationData = {
        name: `Test Station ${plan}`,
        location: 'Test Location',
        fuelTypes: ['petrol', 'diesel']
      };
      await this.testEndpoint('POST', '/stations', stationData, token, 201, 
        `${plan} Owner: Create station`);
    }

    // Test User Management
    if (access.users.view) {
      await this.testEndpoint('GET', '/users', null, token, 200, 
        `${plan} Owner: View users`);
    }

    if (access.users.create) {
      const userData = {
        name: `Test User ${plan}`,
        email: `test-new-${plan}@example.com`,
        role: 'attendant',
        password: 'test123'
      };
      await this.testEndpoint('POST', '/users', userData, token, 201, 
        `${plan} Owner: Create user`);
    }

    // Test Reports Access
    if (access.reports.view) {
      await this.testEndpoint('GET', '/reports/sales', null, token, 200, 
        `${plan} Owner: View reports`);
    } else {
      await this.testEndpoint('GET', '/reports/sales', null, token, 403, 
        `${plan} Owner: Reports denied (expected)`);
    }

    // Test Analytics Access
    if (access.analytics.view) {
      await this.testEndpoint('GET', '/analytics/station-comparison', null, token, 200, 
        `${plan} Owner: View analytics`);
    } else {
      await this.testEndpoint('GET', '/analytics/station-comparison', null, token, 403, 
        `${plan} Owner: Analytics denied (expected)`);
    }

    // Test Creditors Access
    if (access.creditors.view) {
      await this.testEndpoint('GET', '/creditors', null, token, 200, 
        `${plan} Owner: View creditors`);
    } else {
      await this.testEndpoint('GET', '/creditors', null, token, 403, 
        `${plan} Owner: Creditors denied (expected)`);
    }

    // Test Edge Cases
    await this.testOwnerEdgeCases(plan, token);
  }

  async testOwnerEdgeCases(plan, token) {
    console.log(`\n🔍 Testing Owner Edge Cases - ${plan}`);
    
    // Test invalid station ID
    await this.testEndpoint('GET', '/stations/invalid-uuid', null, token, 400, 
      `${plan} Owner: Invalid station ID`);

    // Test unauthorized tenant access
    await this.testEndpoint('GET', '/stations?tenant_id=different-tenant', null, token, 403, 
      `${plan} Owner: Cross-tenant access denied`);

    // Test malformed requests
    await this.testEndpoint('POST', '/stations', { invalid: 'data' }, token, 400, 
      `${plan} Owner: Malformed station creation`);

    // Test plan limits (for starter plan)
    if (plan === 'starter') {
      // Try to create more stations than allowed
      for (let i = 0; i < 3; i++) {
        await this.testEndpoint('POST', '/stations', {
          name: `Limit Test Station ${i}`,
          location: 'Test Location'
        }, token, i < 1 ? 201 : 403, 
          `${plan} Owner: Station limit test ${i + 1}`);
      }
    }
  }

  async runManagerJourneyTests(plan) {
    console.log(`\n👔 TESTING MANAGER JOURNEY - ${plan.toUpperCase()} PLAN`);
    console.log('='.repeat(60));

    const token = await this.authenticateUser(plan, 'manager');
    const access = ROLE_ACCESS_MATRIX[plan].manager;

    // Test Dashboard Access
    await this.testEndpoint('GET', '/dashboard', null, token, 200, 
      `${plan} Manager: Dashboard access`);

    // Test Station Management (limited)
    await this.testEndpoint('GET', '/stations', null, token, 200, 
      `${plan} Manager: View stations`);

    if (access.stations.create) {
      await this.testEndpoint('POST', '/stations', {
        name: `Manager Station ${plan}`,
        location: 'Manager Location'
      }, token, 201, `${plan} Manager: Create station`);
    } else {
      await this.testEndpoint('POST', '/stations', {
        name: `Manager Station ${plan}`,
        location: 'Manager Location'
      }, token, 403, `${plan} Manager: Create station denied (expected)`);
    }

    // Test User Management (limited)
    if (access.users.view) {
      await this.testEndpoint('GET', '/users', null, token, 200, 
        `${plan} Manager: View users`);
    }

    if (!access.users.create) {
      await this.testEndpoint('POST', '/users', {
        name: 'Test User',
        email: 'test@example.com',
        role: 'attendant'
      }, token, 403, `${plan} Manager: Create user denied (expected)`);
    }

    // Test Reports and Analytics
    await this.testReportsAndAnalytics(plan, 'manager', token, access);
  }

  async runAttendantJourneyTests(plan) {
    console.log(`\n👷 TESTING ATTENDANT JOURNEY - ${plan.toUpperCase()} PLAN`);
    console.log('='.repeat(60));

    const token = await this.authenticateUser(plan, 'attendant');
    const access = ROLE_ACCESS_MATRIX[plan].attendant;

    // Test Dashboard Access
    await this.testEndpoint('GET', '/dashboard', null, token, 200, 
      `${plan} Attendant: Dashboard access`);

    // Test Read-only Station Access
    await this.testEndpoint('GET', '/stations', null, token, 200, 
      `${plan} Attendant: View stations`);

    await this.testEndpoint('POST', '/stations', {
      name: 'Attendant Station',
      location: 'Test Location'
    }, token, 403, `${plan} Attendant: Create station denied (expected)`);

    // Test User Management (should be denied)
    await this.testEndpoint('GET', '/users', null, token, 403, 
      `${plan} Attendant: View users denied (expected)`);

    // Test Own Data Access
    await this.testEndpoint('GET', '/nozzle-readings', null, token, 200, 
      `${plan} Attendant: View own readings`);

    // Test Cash Reports (own only)
    await this.testEndpoint('GET', '/attendant/cash-reports', null, token, 200, 
      `${plan} Attendant: View own cash reports`);

    // Test Restricted Features
    await this.testRestrictedFeatures(plan, 'attendant', token, access);
  }

  async testReportsAndAnalytics(plan, role, token, access) {
    if (access.reports.view) {
      await this.testEndpoint('GET', '/reports/sales', null, token, 200, 
        `${plan} ${role}: View reports`);
      
      if (access.reports.generate) {
        await this.testEndpoint('POST', '/reports/sales', {
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          format: 'csv'
        }, token, 200, `${plan} ${role}: Generate reports`);
      }
    } else {
      await this.testEndpoint('GET', '/reports/sales', null, token, 403, 
        `${plan} ${role}: Reports denied (expected)`);
    }

    if (access.analytics.view) {
      await this.testEndpoint('GET', '/analytics/station-comparison', null, token, 200, 
        `${plan} ${role}: View analytics`);
    } else {
      await this.testEndpoint('GET', '/analytics/station-comparison', null, token, 403, 
        `${plan} ${role}: Analytics denied (expected)`);
    }
  }

  async testRestrictedFeatures(plan, role, token, access) {
    // Test all restricted endpoints
    const restrictedEndpoints = [
      { method: 'GET', path: '/reports/sales', feature: 'reports' },
      { method: 'GET', path: '/analytics/station-comparison', feature: 'analytics' },
      { method: 'GET', path: '/creditors', feature: 'creditors' },
      { method: 'POST', path: '/users', feature: 'users' },
      { method: 'DELETE', path: '/stations/test-id', feature: 'stations' }
    ];

    for (const endpoint of restrictedEndpoints) {
      const hasAccess = access[endpoint.feature]?.view || access[endpoint.feature]?.create;
      const expectedStatus = hasAccess ? 200 : 403;
      
      await this.testEndpoint(endpoint.method, endpoint.path, null, token, expectedStatus, 
        `${plan} ${role}: ${endpoint.feature} access test`);
    }
  }

  async runAllTests() {
    await this.setup();

    // Test all combinations of plans and roles
    const plans = ['starter', 'pro'];
    
    for (const plan of plans) {
      await this.runOwnerJourneyTests(plan);
      await this.runManagerJourneyTests(plan);
      await this.runAttendantJourneyTests(plan);
    }

    // Test cross-tenant access prevention
    await this.testCrossTenantAccess();

    // Test plan upgrade scenarios
    await this.testPlanUpgradeScenarios();

    this.printResults();
  }

  async testCrossTenantAccess() {
    console.log('\n🔒 TESTING CROSS-TENANT ACCESS PREVENTION');
    console.log('='.repeat(60));

    // Use starter owner token to try accessing pro tenant data
    const starterToken = testData.tokens.starter_owner;
    const proTenantId = testData.tenants.pro.id;

    await this.testEndpoint('GET', `/stations?tenant_id=${proTenantId}`, null, starterToken, 403, 
      'Cross-tenant station access denied');
  }

  async testPlanUpgradeScenarios() {
    console.log('\n📈 TESTING PLAN UPGRADE SCENARIOS');
    console.log('='.repeat(60));

    // Test what happens when a starter user tries pro features
    const starterToken = testData.tokens.starter_owner;

    await this.testEndpoint('GET', '/reports/sales', null, starterToken, 403, 
      'Starter plan reports access denied');

    await this.testEndpoint('GET', '/creditors', null, starterToken, 403, 
      'Starter plan creditors access denied');
  }

  printResults() {
    console.log('\n📊 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Total: ${this.testResults.passed + this.testResults.failed}`);
    console.log(`📊 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`   - ${test.name} (Expected: ${test.expectedStatus}, Got: ${test.actualStatus})`);
        });
    }

    console.log('\n🎉 COMPREHENSIVE USER JOURNEY TESTING COMPLETE!');
  }

  async cleanup() {
    if (this.db) {
      // Clean up test data
      await this.db.query('DELETE FROM public.users WHERE email LIKE \'%test-%\'');
      await this.db.query('DELETE FROM public.tenants WHERE name LIKE \'%Test%\'');
      await this.db.end();
    }
  }
}

// Run the tests
async function runComprehensiveTests() {
  const tester = new UserJourneyTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await tester.cleanup();
  }
}

// Export for use in other test files
module.exports = { UserJourneyTester, runComprehensiveTests };

// Run if called directly
if (require.main === module) {
  runComprehensiveTests();
}
