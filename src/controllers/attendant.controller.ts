// Types handled by TypeScript compilation
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';
import { listCreditors } from '../services/creditor.service';
import { parseRows } from '../utils/parseDb';

export function createAttendantHandlers(db: Pool) {
  return {
    // Health check endpoint
    healthCheck: async (_req: Request, res: Response) => {
      try {
        successResponse(res, { status: 'ok', timestamp: new Date().toISOString() });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Health check failed');
      }
    },
    
    // Get stations for attendant
    stations: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        const query = `
          SELECT id, name, address, status, created_at
          FROM stations
          WHERE tenant_id = $1 AND status = 'active'
          ORDER BY name
        `;
        
        const result = await db.query(query, [tenantId]);
        
        const stations = result.rows.map(station => ({
          id: station.id,
          name: station.name,
          address: station.address,
          status: station.status,
          createdAt: station.created_at
        }));
        
        successResponse(res, { stations });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Failed to fetch stations');
      }
    },
    
    // Get pumps for attendant
    pumps: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // For now, just return a placeholder response
        successResponse(res, { pumps: [] });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Failed to fetch pumps');
      }
    },
    
    // Get nozzles for attendant - reuse owner's logic
    nozzles: async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return errorResponse(res, 400, 'Missing tenant context');
      }
      
      const prisma = (await import('../utils/prisma')).default;
      
      const nozzlesRaw = await prisma.nozzle.findMany({
        where: { tenant_id: tenantId },
        include: { pump: { select: { name: true } } },
        orderBy: { nozzle_number: 'asc' }
      });
      
      if (nozzlesRaw.length === 0) {
        return successResponse(res, { nozzles: [] });
      }
      
      // Get fuel prices for this tenant
      const fuelPrices = await prisma.fuelPrice.findMany({
        where: { tenant_id: tenantId }
      });
      
      const priceMap = fuelPrices.reduce((acc, fp) => {
        acc[fp.fuel_type] = Number(fp.price);
        return acc;
      }, {} as Record<string, number>);
      
      const nozzles = nozzlesRaw.map(n => ({
        id: n.id,
        name: `Nozzle ${n.nozzle_number}`,
        pumpId: n.pump_id,
        pumpName: n.pump?.name || '',
        nozzleNumber: n.nozzle_number,
        fuelType: n.fuel_type,
        status: n.status,
        currentPrice: priceMap[n.fuel_type] || 0,
        createdAt: n.created_at
      }));
      
      successResponse(res, { nozzles });
    },
    
    // Get creditors for attendant
    creditors: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // Get stationId from query params
        const stationId = req.query.stationId as string;
        
        // Log for debugging
        console.log(`[ATTENDANT-API] Fetching creditors for tenant ${tenantId}, station ${stationId || 'all'}`);
        
        // Get creditors for the tenant, filtered by station if provided
        const creditors = await listCreditors(db, tenantId, stationId);
        
        if (creditors.length === 0) {
          return successResponse(res, { creditors: [] });
        }
        
        // Map to expected format
        const mappedCreditors = creditors.map(creditor => ({
          id: creditor.id,
          partyName: creditor.party_name,
          name: creditor.party_name,
          contactNumber: creditor.contact_number,
          address: creditor.address,
          creditLimit: Number(creditor.credit_limit),
          status: creditor.status,
          stationId: creditor.station_id,
          stationName: creditor.station_name,
          createdAt: creditor.created_at
        }));
        
        console.log(`[ATTENDANT-API] Found ${mappedCreditors.length} creditors for tenant ${tenantId}, station ${stationId || 'all'}`);
        successResponse(res, { creditors: mappedCreditors });
      } catch (err: any) {
        console.error('[ATTENDANT-API] Error fetching creditors:', err);
        return errorResponse(res, 500, err.message || 'Failed to fetch creditors');
      }
    },
    
    // Submit cash report
    cashReport: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const {
          stationId,
          cashAmount = 0,
          cardAmount = 0,
          upiAmount = 0,
          creditAmount = 0,
          creditorId,
          shift = 'day',
          notes,
          date = new Date().toISOString().split('T')[0]
        } = req.body;

        if (!stationId) {
          return errorResponse(res, 400, 'Station ID is required');
        }

        // Validate amounts
        const cash = parseFloat(cashAmount) || 0;
        const card = parseFloat(cardAmount) || 0;
        const upi = parseFloat(upiAmount) || 0;
        const credit = parseFloat(creditAmount) || 0;
        const total = cash + card + upi + credit;

        if (total <= 0) {
          return errorResponse(res, 400, 'At least one amount must be greater than zero');
        }

        // Validate creditor if credit amount is provided
        if (credit > 0) {
          if (!creditorId) {
            return errorResponse(res, 400, 'Creditor must be selected when credit amount is provided');
          }

          // Verify creditor exists and belongs to the tenant/station
          const creditorCheck = await db.query(
            'SELECT id FROM public.creditors WHERE id = $1 AND tenant_id = $2 AND station_id = $3 AND status = $4',
            [creditorId, tenantId, stationId, 'active']
          );

          if (creditorCheck.rowCount === 0) {
            return errorResponse(res, 400, 'Invalid or inactive creditor selected');
          }
        }

        // Verify station exists and user has access
        const stationCheck = await db.query(
          'SELECT id FROM public.stations WHERE id = $1 AND tenant_id = $2',
          [stationId, tenantId]
        );

        if (stationCheck.rowCount === 0) {
          return errorResponse(res, 400, 'Invalid station ID');
        }

        const client = await db.connect();
        try {
          await client.query('BEGIN');
          
          // Insert cash report
          const reportId = randomUUID();
          const totalCollected = cash + card + upi;
          const uniqueShift = `${shift}_${Date.now()}`;
          const result = await client.query(`
            INSERT INTO public.cash_reports (
              id, tenant_id, station_id, user_id, date, shift,
              cash_collected, card_collected, upi_collected, total_collected,
              notes, status, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'submitted', NOW(), NOW()
            )
            RETURNING id, total_collected
          `, [reportId, tenantId, stationId, userId, date, uniqueShift, cash, card, upi, totalCollected, notes]);

          const report = result.rows[0];
          
          // If credit was given, create a sales record
          if (credit > 0 && creditorId) {
            await client.query(`
              INSERT INTO public.sales (
                id, tenant_id, station_id, nozzle_id, volume, fuel_type, fuel_price,
                amount, payment_method, creditor_id, recorded_at, status, created_at, updated_at
              ) VALUES (
                $1, $2, $3,
                (SELECT n.id FROM nozzles n JOIN pumps p ON n.pump_id = p.id WHERE p.station_id = $3 AND p.tenant_id = $2 LIMIT 1),
                0, 'petrol', 0, $4, 'credit', $5, $6::date, 'posted', NOW(), NOW()
              )
            `, [randomUUID(), tenantId, stationId, credit, creditorId, date]);
          }
          
          await client.query('COMMIT');
          console.log(`[CASH-REPORT] Created: ${report.id} for station ${stationId}, total: ${report.total_collected}`);

          successResponse(res, {
            id: report.id,
            totalAmount: report.total_collected,
            message: 'Cash report submitted successfully'
          }, 'Cash report submitted successfully', 201);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (err: any) {
        console.error('[CASH-REPORT] Error:', err);
        return errorResponse(res, 500, err.message || 'Failed to submit cash report');
      }
    },
    
    // Get cash reports
    cashReports: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        
        if (!tenantId || !userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        const { listCashReports } = await import('../services/cashReport.service');
        const reports = await listCashReports(db, tenantId, userId, userRole);
        
        successResponse(res, { reports });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Failed to fetch cash reports');
      }
    },
    
    // Get alerts
    alerts: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // For now, just return a placeholder response
        successResponse(res, { alerts: [] });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Failed to fetch alerts');
      }
    },
    
    // Acknowledge alert
    acknowledgeAlert: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // For now, just return a placeholder response
        successResponse(res, { status: 'ok' });
      } catch (err: any) {
        return errorResponse(res, 500, err.message || 'Failed to acknowledge alert');
      }
    },

    // Get today's summary
    todaysSummary: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const today = new Date().toISOString().split('T')[0];
        
        // Get today's cash reports for this user
        const cashReportsQuery = `
          SELECT 
            cr.id,
            cr.station_id,
            s.name as station_name,
            cr.cash_collected,
            cr.card_collected,
            cr.upi_collected,
            cr.total_collected,
            cr.shift,
            cr.created_at
          FROM cash_reports cr
          JOIN stations s ON cr.station_id = s.id
          WHERE cr.tenant_id = $1 
            AND cr.user_id = $2 
            AND cr.date = $3
          ORDER BY cr.created_at DESC
        `;
        
        const cashReports = await db.query(cashReportsQuery, [tenantId, userId, today]);
        
        // Calculate totals
        const totalCash = cashReports.rows.reduce((sum, report) => sum + Number(report.cash_collected || 0), 0);
        const totalCard = cashReports.rows.reduce((sum, report) => sum + Number(report.card_collected || 0), 0);
        const totalUpi = cashReports.rows.reduce((sum, report) => sum + Number(report.upi_collected || 0), 0);
        const totalCollected = cashReports.rows.reduce((sum, report) => sum + Number(report.total_collected || 0), 0);
        
        // Get stations assigned to this user
        const stationsQuery = `
          SELECT DISTINCT s.id, s.name
          FROM stations s
          WHERE s.tenant_id = $1
          ORDER BY s.name
        `;
        
        const stations = await db.query(stationsQuery, [tenantId]);
        
        successResponse(res, {
          date: today,
          summary: {
            totalCash,
            totalCard,
            totalUpi,
            totalCollected,
            reportsCount: cashReports.rows.length
          },
          recentReports: cashReports.rows.map(report => ({
            id: report.id,
            stationId: report.station_id,
            stationName: report.station_name,
            cashCollected: Number(report.cash_collected || 0),
            cardCollected: Number(report.card_collected || 0),
            upiCollected: Number(report.upi_collected || 0),
            totalCollected: Number(report.total_collected || 0),
            shift: report.shift,
            createdAt: report.created_at
          })),
          stations: stations.rows.map(station => ({
            id: station.id,
            name: station.name
          }))
        });
      } catch (err: any) {
        console.error('[TODAYS-SUMMARY] Error:', err);
        return errorResponse(res, 500, err.message || 'Failed to fetch today\'s summary');
      }
    },

    // Get today's sales - reuse owner's logic
    todaysSales: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const today = new Date().toISOString().split('T')[0];
        
        const query = `
          SELECT 
            s.id,
            s.nozzle_id,
            s.volume,
            s.fuel_type,
            s.fuel_price,
            s.amount,
            s.payment_method,
            s.recorded_at,
            n.nozzle_number,
            p.name as pump_name,
            st.name as station_name
          FROM sales s
          LEFT JOIN nozzles n ON s.nozzle_id = n.id
          LEFT JOIN pumps p ON n.pump_id = p.id
          LEFT JOIN stations st ON p.station_id = st.id
          WHERE s.tenant_id = $1 
            AND DATE(s.recorded_at) = $2
            AND s.status IN ('posted', 'reconciled')
          ORDER BY s.recorded_at DESC
        `;
        
        const result = await db.query(query, [tenantId, today]);
        
        const sales = result.rows.map(sale => ({
          id: sale.id,
          nozzleId: sale.nozzle_id,
          nozzleNumber: sale.nozzle_number,
          pumpName: sale.pump_name,
          stationName: sale.station_name,
          volume: Number(sale.volume),
          fuelType: sale.fuel_type,
          fuelPrice: Number(sale.fuel_price),
          amount: Number(sale.amount),
          paymentMethod: sale.payment_method,
          recordedAt: sale.recorded_at
        }));
        
        successResponse(res, { sales });
      } catch (err: any) {
        console.error('[TODAYS-SALES] Error:', err);
        return errorResponse(res, 500, err.message || 'Failed to fetch today\'s sales');
      }
    },

    // Get readings for attendant
    readings: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const prisma = (await import('../utils/prisma')).default;
        
        // Get recent readings (last 10) from sales table since that's where readings are stored
        const sales = await prisma.sale.findMany({
          where: { tenant_id: tenantId },
          include: {
            nozzle: {
              include: {
                pump: {
                  include: {
                    station: { select: { name: true } }
                  }
                }
              }
            }
          },
          orderBy: { created_at: 'desc' },
          take: 10
        });
        
        const formattedReadings = sales.map((sale: any) => ({
          id: sale.id,
          nozzleId: sale.nozzle_id,
          nozzleName: `Nozzle ${sale.nozzle?.nozzle_number}`,
          pumpName: sale.nozzle?.pump?.name,
          stationName: sale.nozzle?.pump?.station?.name,
          volume: Number(sale.volume),
          fuelType: sale.fuel_type,
          fuelPrice: Number(sale.fuel_price),
          amount: Number(sale.amount),
          recordedAt: sale.created_at
        }));
        
        successResponse(res, { readings: formattedReadings });
      } catch (err: any) {
        console.error('[READINGS] Error:', err);
        return errorResponse(res, 500, err.message || 'Failed to fetch readings');
      }
    },

    // Create reading for attendant
    createReading: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }

        const { nozzleId, reading, recordedAt } = req.body;

        if (!nozzleId || !reading) {
          return errorResponse(res, 400, 'Nozzle ID and reading are required');
        }

        const readingValue = parseFloat(reading);
        if (isNaN(readingValue) || readingValue < 0) {
          return errorResponse(res, 400, 'Invalid reading value');
        }

        const prisma = (await import('../utils/prisma')).default;
        
        // Get nozzle details
        const nozzle = await prisma.nozzle.findFirst({
          where: { id: nozzleId, tenant_id: tenantId },
          include: { pump: { include: { station: true } } }
        });

        if (!nozzle) {
          return errorResponse(res, 404, 'Nozzle not found');
        }

        // Get fuel price
        const fuelPrice = await prisma.fuelPrice.findFirst({
          where: { 
            tenant_id: tenantId,
            station_id: nozzle.pump.station_id,
            fuel_type: nozzle.fuel_type
          },
          orderBy: { created_at: 'desc' }
        });

        if (!fuelPrice) {
          return errorResponse(res, 404, 'Fuel price not found');
        }

        // Get last reading for this nozzle
        const lastReading = await prisma.nozzleReading.findFirst({
          where: { nozzle_id: nozzleId, tenant_id: tenantId },
          orderBy: { recorded_at: 'desc' }
        });

        const previousReading = lastReading ? Number(lastReading.reading) : 0;
        const volume = readingValue - previousReading;
        const amount = volume * Number(fuelPrice.price);

        if (volume < 0) {
          return errorResponse(res, 400, `Reading cannot be less than previous reading (${previousReading}L)`);
        }

        // Create nozzle reading record
        const nozzleReading = await prisma.nozzleReading.create({
          data: {
            id: randomUUID(),
            tenant_id: tenantId,
            nozzle_id: nozzleId,
            reading: readingValue,
            recorded_at: recordedAt ? new Date(recordedAt) : new Date()
          }
        });

        // Create sale record if volume > 0
        if (volume > 0) {
          await prisma.sale.create({
            data: {
              id: randomUUID(),
              tenant_id: tenantId,
              nozzle_id: nozzleId,
              reading_id: nozzleReading.id,
              station_id: nozzle.pump.station_id,
              volume: volume,
              fuel_type: nozzle.fuel_type,
              fuel_price: Number(fuelPrice.price),
              amount: amount,
              payment_method: 'cash',
              created_by: userId,
              recorded_at: recordedAt ? new Date(recordedAt) : new Date()
            }
          });
        }

        successResponse(res, {
          id: nozzleReading.id,
          reading: readingValue,
          volume: volume,
          amount: amount,
          message: 'Reading created successfully'
        }, 'Reading created successfully', 201);
      } catch (err: any) {
        console.error('[CREATE-READING] Error:', err);
        return errorResponse(res, 500, err.message || 'Failed to create reading');
      }
    },
  };
}