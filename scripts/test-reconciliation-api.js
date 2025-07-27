const { Pool } = require('pg');

// Load environment variables
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not available, using environment variables');
}

async function testReconciliationAPI() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'fuelsync-server.postgres.database.azure.com',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fuelsync_db',
    user: process.env.DB_USER || 'fueladmin',
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Testing reconciliation API data...');
    
    // Check for stations
    const stations = await pool.query('SELECT id, name FROM public.stations LIMIT 5');
    console.log(`📍 Found ${stations.rows.length} stations:`, stations.rows);
    
    if (stations.rows.length === 0) {
      console.log('❌ No stations found');
      return;
    }
    
    const stationId = stations.rows[0].id;
    console.log(`🏢 Using station: ${stationId}`);
    
    // Check for nozzle readings
    const readings = await pool.query(`
      SELECT nr.*, n.nozzle_number, n.fuel_type, p.station_id
      FROM public.nozzle_readings nr
      JOIN public.nozzles n ON nr.nozzle_id = n.id
      JOIN public.pumps p ON n.pump_id = p.id
      WHERE p.station_id = $1
      ORDER BY nr.recorded_at DESC
      LIMIT 10
    `, [stationId]);
    
    console.log(`📊 Found ${readings.rows.length} readings for station`);
    if (readings.rows.length > 0) {
      console.log('Sample reading:', readings.rows[0]);
    }
    
    // Test the daily summary query
    const testDate = '2024-01-15';
    const summaryQuery = `
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
        WHERE p.station_id = $1
        ORDER BY nr.nozzle_id, nr.recorded_at
      )
      SELECT
        nozzle_id,
        nozzle_number,
        fuel_type,
        COALESCE(previous_reading, 0) as previous_reading,
        current_reading,
        GREATEST(current_reading - COALESCE(previous_reading, 0), 0) as delta_volume,
        price_per_litre,
        GREATEST(current_reading - COALESCE(previous_reading, 0), 0) * price_per_litre as sale_value,
        payment_method
      FROM ordered_readings
      WHERE DATE(recorded_at) = $2
    `;
    
    const summary = await pool.query(summaryQuery, [stationId, testDate]);
    console.log(`📈 Daily summary for ${testDate}: ${summary.rows.length} entries`);
    
    if (summary.rows.length > 0) {
      const total = summary.rows.reduce((sum, row) => sum + parseFloat(row.sale_value || 0), 0);
      console.log(`💰 Total sales: ₹${total.toFixed(2)}`);
      console.log('Sample entry:', summary.rows[0]);
    } else {
      console.log('❌ No sales data for test date');
      
      // Try with any date that has data
      const anyData = await pool.query(`
        SELECT DATE(nr.recorded_at) as date, COUNT(*) as count
        FROM public.nozzle_readings nr
        JOIN public.nozzles n ON nr.nozzle_id = n.id
        JOIN public.pumps p ON n.pump_id = p.id
        WHERE p.station_id = $1
        GROUP BY DATE(nr.recorded_at)
        ORDER BY date DESC
        LIMIT 5
      `, [stationId]);
      
      console.log('📅 Available dates with data:', anyData.rows);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testReconciliationAPI();