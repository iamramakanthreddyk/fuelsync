/**
 * @file tests/superadmin.test.js
 * @description Comprehensive unit tests for SuperAdmin functionality
 */

const request = require('supertest');
const { Pool } = require('pg');
require('dotenv').config();

const BASE_URL = 'http://localhost:3003';

describe('SuperAdmin API Tests', () => {
  let authToken;
  let testPlanId;
  let testTenantId = 'cb5c9efd-fe29-44b3-8d75-e3fa70e0dd9b'; // Test Tenant ID

  beforeAll(async () => {
    // Login as SuperAdmin to get auth token
    const loginResponse = await request(BASE_URL)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'admin@fuelsync.com',
        password: 'Admin@123'
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    authToken = loginResponse.body.data.token;
  });

  describe('Authentication', () => {
    test('should login SuperAdmin successfully', async () => {
      const response = await request(BASE_URL)
        .post('/api/v1/admin/auth/login')
        .send({
          email: 'admin@fuelsync.com',
          password: 'Admin@123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe('superadmin');
    });

    test('should reject invalid SuperAdmin credentials', async () => {
      const response = await request(BASE_URL)
        .post('/api/v1/admin/auth/login')
        .send({
          email: 'admin@fuelsync.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Tenant Management', () => {
    test('should get all tenants', async () => {
      const response = await request(BASE_URL)
        .get('/api/v1/superadmin/tenants')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tenants).toBeInstanceOf(Array);
      expect(response.body.data.tenants.length).toBeGreaterThan(0);

      // Validate tenant structure
      const tenant = response.body.data.tenants[0];
      expect(tenant).toHaveProperty('id');
      expect(tenant).toHaveProperty('name');
      expect(tenant).toHaveProperty('status');
      expect(tenant).toHaveProperty('createdAt');
      expect(tenant).toHaveProperty('plan');
      expect(tenant).toHaveProperty('usage');
      expect(tenant.plan).toHaveProperty('name');
      expect(tenant.plan).toHaveProperty('priceMonthly');
      expect(tenant.usage).toHaveProperty('currentStations');
      expect(tenant.usage).toHaveProperty('totalUsers');
    });

    test('should update tenant status', async () => {
      const response = await request(BASE_URL)
        .patch(`/api/v1/superadmin/tenants/${testTenantId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'suspended',
          reason: 'Test suspension'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Revert back to active
      await request(BASE_URL)
        .patch(`/api/v1/superadmin/tenants/${testTenantId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'active',
          reason: 'Test completed'
        });
    });
  });

  describe('Plan Management', () => {
    test('should get all plans', async () => {
      const response = await request(BASE_URL)
        .get('/api/v1/superadmin/plans')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.plans).toBeInstanceOf(Array);

      // Validate plan structure
      const plan = response.body.data.plans[0];
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('priceMonthly');
      expect(plan).toHaveProperty('priceYearly');
      expect(plan).toHaveProperty('features');
      expect(plan).toHaveProperty('tenantCount');
      expect(typeof plan.priceMonthly).toBe('number');
      expect(plan.features).toBeInstanceOf(Array);
    });

    test('should create a new plan', async () => {
      const newPlan = {
        name: 'Test Plan API',
        maxStations: 3,
        maxPumpsPerStation: 8,
        maxNozzlesPerPump: 4,
        priceMonthly: 1299,
        priceYearly: 12990,
        features: [
          'Advanced Dashboard',
          'Multi-Station Support',
          'Advanced Analytics',
          'Priority Support'
        ]
      };

      const response = await request(BASE_URL)
        .post('/api/v1/superadmin/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newPlan);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.plan).toHaveProperty('id');
      expect(response.body.data.plan.name).toBe(newPlan.name);
      expect(response.body.data.plan.price_monthly).toBe(newPlan.priceMonthly.toString());

      testPlanId = response.body.data.plan.id;
    });

    test('should update an existing plan', async () => {
      const updatedPlan = {
        name: 'Updated Test Plan API',
        maxStations: 5,
        maxPumpsPerStation: 10,
        maxNozzlesPerPump: 5,
        priceMonthly: 1499,
        priceYearly: 14990,
        features: [
          'Advanced Dashboard',
          'Multi-Station Support',
          'Advanced Analytics',
          'Priority Support',
          'Custom Branding'
        ]
      };

      const response = await request(BASE_URL)
        .put(`/api/v1/superadmin/plans/${testPlanId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedPlan);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.plan.name).toBe(updatedPlan.name);
      expect(response.body.data.plan.max_stations).toBe(updatedPlan.maxStations);
    });

    test('should reject plan creation with missing fields', async () => {
      const invalidPlan = {
        name: 'Invalid Plan'
        // Missing required fields
      };

      const response = await request(BASE_URL)
        .post('/api/v1/superadmin/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPlan);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });
  });

  describe('User Management', () => {
    test('should get all users', async () => {
      const response = await request(BASE_URL)
        .get('/api/v1/superadmin/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tenantUsers');
      expect(response.body.data).toHaveProperty('adminUsers');
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data.tenantUsers).toBeInstanceOf(Array);
      expect(response.body.data.adminUsers).toBeInstanceOf(Array);
      expect(typeof response.body.data.totalUsers).toBe('number');

      // Validate user structure
      if (response.body.data.tenantUsers.length > 0) {
        const user = response.body.data.tenantUsers[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('tenant');
      }
    });
  });

  describe('Analytics', () => {
    test('should get usage analytics', async () => {
      const response = await request(BASE_URL)
        .get('/api/v1/superadmin/analytics/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('systemStats');
      expect(response.body.data).toHaveProperty('planDistribution');
      expect(response.body.data).toHaveProperty('activitySummary');

      // Validate system stats
      const stats = response.body.data.systemStats;
      expect(stats).toHaveProperty('totalTenants');
      expect(stats).toHaveProperty('activeTenants');
      expect(stats).toHaveProperty('totalUsers');
      expect(typeof stats.totalTenants).toBe('number');
      expect(typeof stats.totalUsers).toBe('number');
    });

    test('should get tenant-specific analytics', async () => {
      const response = await request(BASE_URL)
        .get(`/api/v1/superadmin/analytics/tenant/${testTenantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tenant');
      expect(response.body.data).toHaveProperty('usage');
      expect(response.body.data).toHaveProperty('planTier');

      // Validate tenant analytics structure
      const tenant = response.body.data.tenant;
      expect(tenant).toHaveProperty('name');
      expect(tenant).toHaveProperty('status');
      expect(tenant).toHaveProperty('plan_name');
    });
  });

  describe('Authorization', () => {
    test('should reject requests without auth token', async () => {
      const response = await request(BASE_URL)
        .get('/api/v1/superadmin/tenants');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should reject requests with invalid auth token', async () => {
      const response = await request(BASE_URL)
        .get('/api/v1/superadmin/tenants')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  afterAll(async () => {
    // Clean up test plan if created
    if (testPlanId) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      try {
        await pool.query('DELETE FROM public.plans WHERE id = $1', [testPlanId]);
        console.log('🧹 Cleaned up test plan');
      } catch (error) {
        console.warn('Warning: Could not clean up test plan:', error.message);
      } finally {
        await pool.end();
      }
    }
  });
});
