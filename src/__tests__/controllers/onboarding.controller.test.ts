/**
 * @file onboarding.controller.test.ts
 * @description Comprehensive tests for onboarding controller
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { getReminders } from '../controllers/onboarding.controller';

// Mock the database
const mockQuery = vi.fn();
const mockDb = {
  query: mockQuery
} as unknown as Pool;

// Mock the database module
vi.mock('../config/database', () => ({
  default: mockDb
}));

// Mock the response utilities
const mockSuccessResponse = vi.fn();
const mockErrorResponse = vi.fn();

vi.mock('../utils/response', () => ({
  successResponse: mockSuccessResponse,
  errorResponse: mockErrorResponse
}));

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock middleware
app.use((req: any, res, next) => {
  req.user = { id: 'test-user-id', tenantId: 'test-tenant-id' };
  next();
});

app.get('/reminders', getReminders);

describe('Onboarding Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuccessResponse.mockImplementation((res, data, message) => {
      res.status(200).json({ success: true, data, message });
    });
    mockErrorResponse.mockImplementation((res, message, statusCode = 500) => {
      res.status(statusCode).json({ success: false, message });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /reminders', () => {
    describe('Success Cases', () => {
      it('should return empty reminders when no issues found', async () => {
        // Mock database queries to return no issues
        mockQuery
          .mockResolvedValueOnce({ rows: [{ last_date: '2024-01-01' }] }) // reconciliation check
          .mockResolvedValueOnce({ rows: [] }) // low inventory check
          .mockResolvedValueOnce({ rows: [] }); // pending readings check

        const response = await request(app).get('/reminders');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
        expect(mockQuery).toHaveBeenCalledTimes(3);
      });

      it('should return reconciliation reminder when last reconciliation is old', async () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 3); // 3 days ago

        mockQuery
          .mockResolvedValueOnce({ rows: [{ last_date: oldDate.toISOString().split('T')[0] }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app).get('/reminders');

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({
          type: 'reconciliation',
          priority: 'high',
          title: 'Daily Reconciliation Overdue'
        });
      });

      it('should return low inventory reminder when fuel is below minimum level', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ last_date: new Date().toISOString().split('T')[0] }] })
          .mockResolvedValueOnce({ rows: [{ fuel_type: 'Petrol', current_stock: 500 }] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app).get('/reminders');

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({
          type: 'inventory',
          priority: 'urgent',
          title: 'Low Fuel Inventory Alert'
        });
      });

      it('should return multiple reminders when multiple issues exist', async () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 2);

        mockQuery
          .mockResolvedValueOnce({ rows: [{ last_date: oldDate.toISOString().split('T')[0] }] })
          .mockResolvedValueOnce({ rows: [{ fuel_type: 'Diesel', current_stock: 200 }] })
          .mockResolvedValueOnce({ rows: [{ count: '5' }] });

        const response = await request(app).get('/reminders');

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(3);
        
        const reminderTypes = response.body.data.map((r: any) => r.type);
        expect(reminderTypes).toContain('reconciliation');
        expect(reminderTypes).toContain('inventory');
        expect(reminderTypes).toContain('readings');
      });

      it('should set correct priority levels', async () => {
        const veryOldDate = new Date();
        veryOldDate.setDate(veryOldDate.getDate() - 5); // 5 days ago

        mockQuery
          .mockResolvedValueOnce({ rows: [{ last_date: veryOldDate.toISOString().split('T')[0] }] })
          .mockResolvedValueOnce({ rows: [{ fuel_type: 'Petrol', current_stock: 100 }] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app).get('/reminders');

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
        
        const reconciliationReminder = response.body.data.find((r: any) => r.type === 'reconciliation');
        const inventoryReminder = response.body.data.find((r: any) => r.type === 'inventory');
        
        expect(reconciliationReminder.priority).toBe('urgent'); // > 3 days
        expect(inventoryReminder.priority).toBe('urgent'); // low stock
      });
    });

    describe('Database Query Validation', () => {
      it('should use correct table name for reconciliation check', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ last_date: '2024-01-01' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        await request(app).get('/reminders');

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT MAX(DATE(created_at)) as last_date FROM public.day_reconciliations WHERE tenant_id = $1',
          ['test-tenant-id']
        );
      });

      it('should use correct column name for inventory check', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ last_date: '2024-01-01' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        await request(app).get('/reminders');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('fi.current_stock < fi.minimum_level'),
          ['test-tenant-id']
        );
      });

      it('should filter by tenant_id in all queries', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ last_date: '2024-01-01' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        await request(app).get('/reminders');

        // All queries should include tenant_id filter
        expect(mockQuery).toHaveBeenNthCalledWith(1, expect.any(String), ['test-tenant-id']);
        expect(mockQuery).toHaveBeenNthCalledWith(2, expect.any(String), ['test-tenant-id']);
        expect(mockQuery).toHaveBeenNthCalledWith(3, expect.any(String), ['test-tenant-id']);
      });
    });

    describe('Error Handling', () => {
      it('should handle database connection errors', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

        const response = await request(app).get('/reminders');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Failed to get reminders');
      });

      it('should handle SQL syntax errors', async () => {
        mockQuery.mockRejectedValueOnce(new Error('syntax error at or near "FROM"'));

        const response = await request(app).get('/reminders');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });

      it('should handle missing tenant_id', async () => {
        const appWithoutTenant = express();
        appWithoutTenant.use(express.json());
        appWithoutTenant.use((req: any, res, next) => {
          req.user = { id: 'test-user-id' }; // No tenantId
          next();
        });
        appWithoutTenant.get('/reminders', getReminders);

        const response = await request(appWithoutTenant).get('/reminders');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });

      it('should handle partial query failures gracefully', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ last_date: '2024-01-01' }] }) // Success
          .mockRejectedValueOnce(new Error('Inventory table not found')) // Failure
          .mockResolvedValueOnce({ rows: [] }); // Success

        const response = await request(app).get('/reminders');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Authentication & Authorization', () => {
      it('should require authenticated user', async () => {
        const appWithoutAuth = express();
        appWithoutAuth.use(express.json());
        appWithoutAuth.get('/reminders', getReminders);

        const response = await request(appWithoutAuth).get('/reminders');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });

      it('should use user tenant_id for data isolation', async () => {
        const customTenantId = 'custom-tenant-123';
        const appWithCustomTenant = express();
        appWithCustomTenant.use(express.json());
        appWithCustomTenant.use((req: any, res, next) => {
          req.user = { id: 'test-user-id', tenantId: customTenantId };
          next();
        });
        appWithCustomTenant.get('/reminders', getReminders);

        mockQuery
          .mockResolvedValueOnce({ rows: [{ last_date: '2024-01-01' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        await request(appWithCustomTenant).get('/reminders');

        // All queries should use the custom tenant ID
        expect(mockQuery).toHaveBeenNthCalledWith(1, expect.any(String), [customTenantId]);
        expect(mockQuery).toHaveBeenNthCalledWith(2, expect.any(String), [customTenantId]);
        expect(mockQuery).toHaveBeenNthCalledWith(3, expect.any(String), [customTenantId]);
      });
    });

    describe('Performance', () => {
      it('should execute queries efficiently', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ last_date: '2024-01-01' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const startTime = Date.now();
        await request(app).get('/reminders');
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
        expect(mockQuery).toHaveBeenCalledTimes(3); // Should make exactly 3 queries
      });

      it('should handle large result sets efficiently', async () => {
        const largeInventoryResult = Array.from({ length: 100 }, (_, i) => ({
          fuel_type: `Fuel${i}`,
          current_stock: 100
        }));

        mockQuery
          .mockResolvedValueOnce({ rows: [{ last_date: '2024-01-01' }] })
          .mockResolvedValueOnce({ rows: largeInventoryResult })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app).get('/reminders');

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1); // Should consolidate into single inventory reminder
      });
    });
  });
});
