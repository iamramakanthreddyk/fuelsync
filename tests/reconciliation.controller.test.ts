/**
 * @file reconciliation.controller.test.ts
 * @description Comprehensive tests for improved reconciliation controller endpoints
 */
import { Request, Response } from 'express';
import { createReconciliationHandlers } from '../src/controllers/reconciliation.controller';
import * as reconciliationService from '../src/services/reconciliation.service';

// Mock the reconciliation service
jest.mock('../src/services/reconciliation.service');

describe('Reconciliation Controller - Improved Endpoints', () => {
  let mockDb: any;
  let handlers: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn()
    };

    handlers = createReconciliationHandlers(mockDb);

    mockReq = {
      user: {
        tenantId: 'tenant1',
        userId: 'user1',
        role: 'manager'
      },
      query: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('getSummary endpoint', () => {
    test('returns reconciliation summary successfully', async () => {
      const mockSummary = {
        date: '2024-01-15',
        stationId: 'station1',
        stationName: 'Test Station',
        systemCalculated: {
          totalRevenue: 5000,
          cashSales: 3000,
          cardSales: 1000,
          upiSales: 1000,
          creditSales: 0
        },
        userEntered: {
          totalCollected: 4950
        },
        differences: {
          totalDifference: -50
        },
        isReconciled: false,
        canCloseBackdated: true
      };

      (reconciliationService.generateReconciliationSummary as jest.Mock)
        .mockResolvedValue(mockSummary);

      mockReq.query = { stationId: 'station1', date: '2024-01-15' };

      await handlers.getSummary(mockReq as Request, mockRes as Response);

      expect(reconciliationService.generateReconciliationSummary)
        .toHaveBeenCalledWith(mockDb, 'tenant1', 'station1', '2024-01-15');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSummary
      });
    });

    test('returns 400 when stationId is missing', async () => {
      mockReq.query = { date: '2024-01-15' };

      await handlers.getSummary(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Station ID and date are required'
      });
    });

    test('returns 400 when date is missing', async () => {
      mockReq.query = { stationId: 'station1' };

      await handlers.getSummary(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Station ID and date are required'
      });
    });

    test('returns 400 when tenant context is missing', async () => {
      mockReq.user = undefined;
      mockReq.query = { stationId: 'station1', date: '2024-01-15' };

      await handlers.getSummary(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing tenant context'
      });
    });

    test('handles service errors gracefully', async () => {
      (reconciliationService.generateReconciliationSummary as jest.Mock)
        .mockRejectedValue(new Error('Database connection failed'));

      mockReq.query = { stationId: 'station1', date: '2024-01-15' };

      await handlers.getSummary(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection failed'
      });
    });
  });

  describe('closeDay endpoint', () => {
    test('closes day successfully', async () => {
      const mockClosedSummary = {
        date: '2024-01-15',
        stationId: 'station1',
        stationName: 'Test Station',
        isReconciled: true,
        reconciledBy: 'user1',
        reconciledAt: new Date()
      };

      (reconciliationService.closeDayReconciliation as jest.Mock)
        .mockResolvedValue(mockClosedSummary);

      mockReq.body = {
        stationId: 'station1',
        date: '2024-01-15',
        notes: 'Test closure'
      };

      await handlers.closeDay(mockReq as Request, mockRes as Response);

      expect(reconciliationService.closeDayReconciliation)
        .toHaveBeenCalledWith(mockDb, 'tenant1', 'station1', '2024-01-15', 'user1', 'Test closure');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Day closed successfully',
          summary: mockClosedSummary
        }
      });
    });

    test('returns 400 when stationId is missing', async () => {
      mockReq.body = { date: '2024-01-15' };

      await handlers.closeDay(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Station ID and date are required'
      });
    });

    test('handles backdated closure errors', async () => {
      (reconciliationService.closeDayReconciliation as jest.Mock)
        .mockRejectedValue(new Error('Backdated closures are only allowed within 7 days'));

      mockReq.body = {
        stationId: 'station1',
        date: '2024-01-01' // Old date
      };

      await handlers.closeDay(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Backdated closures are only allowed within 7 days'
      });
    });
  });

  describe('getDashboard endpoint', () => {
    test('returns dashboard data successfully', async () => {
      const mockStations = [
        { id: 'station1', name: 'Station 1' },
        { id: 'station2', name: 'Station 2' }
      ];

      const mockSummary1 = {
        systemCalculated: { totalRevenue: 5000 },
        userEntered: { totalCollected: 4950 },
        differences: { totalDifference: -50 },
        isReconciled: false
      };

      const mockSummary2 = {
        systemCalculated: { totalRevenue: 3000 },
        userEntered: { totalCollected: 3000 },
        differences: { totalDifference: 0 },
        isReconciled: true
      };

      mockDb.query.mockResolvedValue({ rows: mockStations });
      (reconciliationService.generateReconciliationSummary as jest.Mock)
        .mockResolvedValueOnce(mockSummary1)
        .mockResolvedValueOnce(mockSummary2);

      await handlers.getDashboard(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          today: expect.any(String),
          stations: expect.arrayContaining([
            expect.objectContaining({
              id: 'station1',
              name: 'Station 1',
              isReconciled: false,
              totalDifference: -50
            }),
            expect.objectContaining({
              id: 'station2',
              name: 'Station 2',
              isReconciled: true,
              totalDifference: 0
            })
          ]),
          summary: expect.objectContaining({
            totalStations: 2,
            reconciledToday: 1,
            pendingReconciliation: 1,
            totalDifferences: 50
          })
        })
      });
    });

    test('handles stations with errors gracefully', async () => {
      const mockStations = [
        { id: 'station1', name: 'Station 1' }
      ];

      mockDb.query.mockResolvedValue({ rows: mockStations });
      (reconciliationService.generateReconciliationSummary as jest.Mock)
        .mockRejectedValue(new Error('Station data error'));

      await handlers.getDashboard(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          stations: expect.arrayContaining([
            expect.objectContaining({
              id: 'station1',
              name: 'Station 1',
              error: 'Failed to load data'
            })
          ])
        })
      });
    });
  });

  describe('getAnalytics endpoint', () => {
    test('returns analytics data successfully', async () => {
      const mockAnalytics = {
        totalReconciliations: 10,
        finalizedReconciliations: 8,
        averageDifference: 25.5,
        largestDifference: 100,
        reconciliationRate: 80,
        stationBreakdown: [
          {
            stationId: 'station1',
            stationName: 'Station 1',
            reconciliations: 5,
            averageDifference: 20
          }
        ]
      };

      (reconciliationService.getReconciliationAnalytics as jest.Mock)
        .mockResolvedValue(mockAnalytics);

      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        stationId: 'station1'
      };

      await handlers.getAnalytics(mockReq as Request, mockRes as Response);

      expect(reconciliationService.getReconciliationAnalytics)
        .toHaveBeenCalledWith(mockDb, 'tenant1', '2024-01-01', '2024-01-31', 'station1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics
      });
    });

    test('works without optional parameters', async () => {
      const mockAnalytics = {
        totalReconciliations: 5,
        finalizedReconciliations: 3,
        averageDifference: 15,
        largestDifference: 50,
        reconciliationRate: 60,
        stationBreakdown: []
      };

      (reconciliationService.getReconciliationAnalytics as jest.Mock)
        .mockResolvedValue(mockAnalytics);

      await handlers.getAnalytics(mockReq as Request, mockRes as Response);

      expect(reconciliationService.getReconciliationAnalytics)
        .toHaveBeenCalledWith(mockDb, 'tenant1', undefined, undefined, undefined);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics
      });
    });
  });
});
