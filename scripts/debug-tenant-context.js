const { Pool } = require('pg');
require('dotenv').config();

async function debugTenantContext() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const stationId = '00000000-0000-0000-0000-000000000020';
    const date = '2025-06-28';
    
    console.log('🔍 Debugging tenant context issue...');
    
    // Check what tenant_id the reading has
    const readingTenant = await pool.query(`
      SELECT nr.tenant_id, nr.recorded_at, n.nozzle_number, p.station_id
      FROM public.nozzle_readings nr
      JOIN public.nozzles n ON nr.nozzle_id = n.id
      JOIN public.pumps p ON n.pump_id = p.id
      WHERE p.station_id = $1
      AND DATE(nr.recorded_at) = $2
    `, [stationId, date]);
    
    console.log('📊 Reading tenant info:', readingTenant.rows);
    
    if (readingTenant.rows.length > 0) {
      const tenantId = readingTenant.rows[0].tenant_id;
      console.log(`🏢 Reading belongs to tenant: ${tenantId}`);
      
      // Test the exact query from the API
      const apiQuery = `
        WITH ordered_readings AS (
          SELECT
            nr.nozzle_id,
            n.nozzle_number,
            n.fuel_type,
            nr.reading as current_reading,
            LAG(nr.reading) OVER (PARTITION BY nr.nozzle_id ORDER BY nr.recorded_at) as previous_reading,
            nr.payment_method,
            nr.recorded_at,
            COALESCE(fp.price, 100) as price_per_litre
          FROM public.nozzle_readings nr
          JOIN public.nozzles n ON nr.nozzle_id = n.id
          JOIN public.pumps p ON n.pump_id = p.id
          LEFT JOIN public.fuel_prices fp ON fp.station_id = p.station_id 
            AND fp.fuel_type = n.fuel_type
            AND fp.tenant_id = $3
          WHERE p.station_id = $1
            AND nr.tenant_id = $3
          ORDER BY nr.nozzle_id, nr.recorded_at
        )
        SELECT
          nozzle_id,
          nozzle_number,
          fuel_type,
          COALESCE(previous_reading, 0) as previous_reading,
          current_reading,
          GREATEST(current_reading - COALESCE(previous_reading, 0), 0) as delta_volume,
          COALESCE(price_per_litre, 0) as price_per_litre,
          GREATEST(current_reading - COALESCE(previous_reading, 0), 0) * COALESCE(price_per_litre, 0) as sale_value,
          payment_method
        FROM ordered_readings
        WHERE DATE(recorded_at) = $2
      `;
      
      const result = await pool.query(apiQuery, [stationId, date, tenantId]);
      console.log(`✅ API query result: ${result.rows.length} rows`);
      
      if (result.rows.length > 0) {
        console.log('Sample result:', result.rows[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await pool.end();
  }
}

debugTenantContext();