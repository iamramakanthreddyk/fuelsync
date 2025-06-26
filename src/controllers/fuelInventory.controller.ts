import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getFuelInventory, createFuelInventoryTable, seedFuelInventory } from '../services/fuelInventory.service';
import { errorResponse } from '../utils/errorResponse';
import { successResponse } from '../utils/successResponse';

export function createFuelInventoryHandlers(db: Pool) {
  return {
    list: async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
          return errorResponse(res, 400, 'Missing tenant context');
        }
        
        // Ensure the table exists
        await createFuelInventoryTable(db, tenantId);
        
        // Check if we need to seed data
        const inventory = await getFuelInventory(db, tenantId);
        
        if (inventory.length === 0) {
          // Seed some initial data
          await seedFuelInventory(db, tenantId);
          // Get the seeded data
          const seededInventory = await getFuelInventory(db, tenantId);
          return successResponse(res, seededInventory);
        }
        
        return successResponse(res, inventory);
      } catch (err: any) {
        console.error('Error in fuel inventory list:', err);
        return errorResponse(res, 500, err.message || 'Internal server error');
      }
    }
  };
}