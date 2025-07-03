import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { parseRows } from '../utils/parseDb';

export interface FuelInventory {
  id: string;
  stationId: string;
  stationName: string;
  fuelType: string;
  currentVolume: number;
  capacity: number;
  lastUpdated: string;
}

export async function getFuelInventory(db: Pool, tenantId: string): Promise<FuelInventory[]> {
  const query = `
    SELECT
      i.id,
      i.station_id as "stationId",
      s.name as "stationName",
      i.fuel_type as "fuelType",
      i.current_volume as "currentVolume",
      i.capacity,
      i.last_updated as "lastUpdated"
    FROM
      public.fuel_inventory i
    JOIN
      public.stations s ON i.station_id = s.id
    WHERE i.tenant_id = $1
    ORDER BY
      s.name, i.fuel_type
  `;

  try {
    const result = await db.query(query, [tenantId]);
    return parseRows(result.rows);
  } catch (error) {
    console.error('Error fetching fuel inventory:', error);
    // If table doesn't exist yet, return empty array
    return [];
  }
}


export async function seedFuelInventory(db: Pool, tenantId: string): Promise<void> {
  // First check if we have any inventory records
  const checkQuery = 'SELECT COUNT(*) FROM public.fuel_inventory WHERE tenant_id = $1';
  const { rows } = await db.query(checkQuery, [tenantId]);
  
  if (parseInt(rows[0].count) > 0) {
    return; // Already has data
  }
  
  // Get all stations
  const stationsQuery = 'SELECT id FROM public.stations WHERE tenant_id = $1';
  const stationsResult = await db.query(stationsQuery, [tenantId]);
  
  // For each station, create inventory for different fuel types
  for (const station of stationsResult.rows) {
    const fuelTypes = ['petrol', 'diesel', 'premium'];
    
    for (const fuelType of fuelTypes) {
      const capacity = Math.floor(Math.random() * 10000) + 5000; // Random capacity between 5000-15000
      const currentVolume = Math.floor(Math.random() * capacity); // Random current volume
      
      await db.query(
        `INSERT INTO public.fuel_inventory
        (id, tenant_id, station_id, fuel_type, current_volume, capacity, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())`,
        [randomUUID(), tenantId, station.id, fuelType, currentVolume, capacity]
      );
    }
  }
}
export interface FuelInventorySummary {
  fuelType: string;
  totalVolume: number;
  totalCapacity: number;
}

export async function getFuelInventorySummary(db: Pool, tenantId: string): Promise<FuelInventorySummary[]> {
  const query = `
    SELECT
      fuel_type as "fuelType",
      SUM(current_volume) as "totalVolume",
      SUM(capacity) as "totalCapacity"
    FROM public.fuel_inventory
    WHERE tenant_id = $1
    GROUP BY fuel_type
    ORDER BY fuel_type
  `;

  try {
    const result = await db.query(query, [tenantId]);
    return parseRows(result.rows);
  } catch (error) {
    console.error('Error fetching fuel inventory summary:', error);
    return [];
  }
}
