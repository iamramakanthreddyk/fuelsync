import { Pool } from 'pg';

export interface NozzleSales {
  nozzleId: string;
  nozzleNumber: number;
  fuelType: string;
  totalVolume: number;
  totalSales: number;
  readingsCount: number;
}

export interface PumpSales {
  pumpId: string;
  pumpName: string;
  nozzles: NozzleSales[];
  totalVolume: number;
  totalSales: number;
}

export interface StationSales {
  stationId: string;
  stationName: string;
  pumps: PumpSales[];
  totalVolume: number;
  totalSales: number;
}

export async function getDailySalesReport(
  db: Pool,
  tenantId: string,
  date: string
): Promise<StationSales[]> {
  const sql = `
    SELECT 
      s.id as station_id,
      s.name as station_name,
      p.id as pump_id,
      p.name as pump_name,
      n.id as nozzle_id,
      n.nozzle_number,
      n.fuel_type,
      COALESCE(SUM(sa.volume), 0) as total_volume,
      COALESCE(SUM(sa.amount), 0) as total_sales,
      COUNT(nr.id) as readings_count
    FROM public.stations s
    LEFT JOIN public.pumps p ON s.id = p.station_id AND p.tenant_id = $1
    LEFT JOIN public.nozzles n ON p.id = n.pump_id AND n.tenant_id = $1
    LEFT JOIN public.nozzle_readings nr ON n.id = nr.nozzle_id 
      AND nr.tenant_id = $1 
      AND DATE(nr.recorded_at) = $2
    LEFT JOIN public.sales sa ON nr.id = sa.reading_id AND sa.tenant_id = $1
    WHERE s.tenant_id = $1
    GROUP BY s.id, s.name, p.id, p.name, n.id, n.nozzle_number, n.fuel_type
    ORDER BY s.name, p.name, n.nozzle_number
  `;

  const result = await db.query(sql, [tenantId, date]);
  
  // Group the results hierarchically
  const stationsMap = new Map<string, StationSales>();
  
  for (const row of result.rows) {
    const stationId = row.station_id;
    const pumpId = row.pump_id;
    const nozzleId = row.nozzle_id;
    
    // Initialize station if not exists
    if (!stationsMap.has(stationId)) {
      stationsMap.set(stationId, {
        stationId,
        stationName: row.station_name,
        pumps: [],
        totalVolume: 0,
        totalSales: 0
      });
    }
    
    const station = stationsMap.get(stationId)!;
    
    // Skip if no pump (station with no pumps)
    if (!pumpId) continue;
    
    // Find or create pump
    let pump = station.pumps.find(p => p.pumpId === pumpId);
    if (!pump) {
      pump = {
        pumpId,
        pumpName: row.pump_name,
        nozzles: [],
        totalVolume: 0,
        totalSales: 0
      };
      station.pumps.push(pump);
    }
    
    // Skip if no nozzle (pump with no nozzles)
    if (!nozzleId) continue;
    
    // Add nozzle data
    const nozzle: NozzleSales = {
      nozzleId,
      nozzleNumber: row.nozzle_number,
      fuelType: row.fuel_type,
      totalVolume: parseFloat(row.total_volume) || 0,
      totalSales: parseFloat(row.total_sales) || 0,
      readingsCount: parseInt(row.readings_count) || 0
    };
    
    pump.nozzles.push(nozzle);
    pump.totalVolume += nozzle.totalVolume;
    pump.totalSales += nozzle.totalSales;
    
    station.totalVolume += nozzle.totalVolume;
    station.totalSales += nozzle.totalSales;
  }
  
  return Array.from(stationsMap.values());
}