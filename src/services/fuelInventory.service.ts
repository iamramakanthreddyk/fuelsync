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
      ${tenantId}.fuel_inventory i
    JOIN
      ${tenantId}.stations s ON i.station_id = s.id
    ORDER BY
      s.name, i.fuel_type
  `;
  
  try {
    const result = await db.query(query);
    return parseRows(result.rows);
  } catch (error) {
    console.error('Error fetching fuel inventory:', error);
    // If table doesn't exist yet, return empty array
    return [];
  }
}

export async function createFuelInventoryTable(db: Pool, tenantId: string): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS ${tenantId}.fuel_inventory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      station_id UUID NOT NULL REFERENCES ${tenantId}.stations(id) ON DELETE CASCADE,
      fuel_type VARCHAR(50) NOT NULL,
      current_volume DECIMAL(10, 2) NOT NULL DEFAULT 0,
      capacity DECIMAL(10, 2) NOT NULL,
      last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(station_id, fuel_type)
    )
  `;
  
  await db.query(query);
}

export async function seedFuelInventory(db: Pool, tenantId: string): Promise<void> {
  // First check if we have any inventory records
  const checkQuery = `SELECT COUNT(*) FROM ${tenantId}.fuel_inventory`;
  const { rows } = await db.query(checkQuery);
  
  if (parseInt(rows[0].count) > 0) {
    return; // Already has data
  }
  
  // Get all stations
  const stationsQuery = `SELECT id FROM ${tenantId}.stations`;
  const stationsResult = await db.query(stationsQuery);
  
  // For each station, create inventory for different fuel types
  for (const station of stationsResult.rows) {
    const fuelTypes = ['petrol', 'diesel', 'premium'];
    
    for (const fuelType of fuelTypes) {
      const capacity = Math.floor(Math.random() * 10000) + 5000; // Random capacity between 5000-15000
      const currentVolume = Math.floor(Math.random() * capacity); // Random current volume
      
      await db.query(`
        INSERT INTO ${tenantId}.fuel_inventory
        (id, station_id, fuel_type, current_volume, capacity, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [randomUUID(), station.id, fuelType, currentVolume, capacity]);
    }
  }
}