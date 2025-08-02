const { Pool } = require('pg');

// Test script to isolate the UUID casting issue
async function testUUIDIssue() {
  const pool = new Pool({
    host: 'fuelsync-server.postgres.database.azure.com',
    user: 'fueladmin',
    password: process.env.DB_PASSWORD || 'FuelSync2024!',
    database: 'fuelsync_db',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Testing UUID casting issues...');
    
    const tenantId = '5e0f0faa-940a-41f6-b6cb-4086f32fbb9a';
    const nozzleId = 'd132123c-8f5e-463f-a013-bc936b673ce8';
    const userId = '123e4567-e89b-12d3-a456-426614174000'; // Test user ID
    
    console.log('1. Testing nozzle query...');
    try {
      const nozzleRes = await pool.query(
        'SELECT nozzle_number, fuel_type FROM public.nozzles WHERE id = $1::uuid AND tenant_id = $2::uuid',
        [nozzleId, tenantId]
      );
      console.log('✅ Nozzle query successful:', nozzleRes.rowCount, 'rows');
    } catch (err) {
      console.log('❌ Nozzle query failed:', err.message);
    }
    
    console.log('2. Testing user query...');
    try {
      const userRes = await pool.query(
        'SELECT role FROM public.users WHERE id = $1::uuid',
        [userId]
      );
      console.log('✅ User query successful:', userRes.rowCount, 'rows');
    } catch (err) {
      console.log('❌ User query failed:', err.message);
    }
    
    console.log('3. Testing last reading query...');
    try {
      const lastRes = await pool.query(
        'SELECT reading, recorded_at FROM public.nozzle_readings WHERE nozzle_id = $1::uuid AND tenant_id = $2::uuid AND status != $3 ORDER BY recorded_at DESC LIMIT 1',
        [nozzleId, tenantId, 'voided']
      );
      console.log('✅ Last reading query successful:', lastRes.rowCount, 'rows');
    } catch (err) {
      console.log('❌ Last reading query failed:', err.message);
    }
    
    console.log('4. Testing nozzle details query...');
    try {
      const detailsRes = await pool.query(
        'SELECT n.fuel_type, p.station_id FROM public.nozzles n JOIN public.pumps p ON n.pump_id = p.id WHERE n.id = $1::uuid AND n.tenant_id = $2::uuid',
        [nozzleId, tenantId]
      );
      console.log('✅ Nozzle details query successful:', detailsRes.rowCount, 'rows');
    } catch (err) {
      console.log('❌ Nozzle details query failed:', err.message);
    }
    
    console.log('5. Testing finalization query...');
    try {
      const stationId = 'e3d3fbdb-9a74-44f7-b03a-f1cc46e643fe';
      const date = new Date();
      const finalRes = await pool.query(
        'SELECT finalized FROM public.day_reconciliations WHERE station_id = $1::uuid AND date = $2::date AND tenant_id = $3::uuid',
        [stationId, date, tenantId]
      );
      console.log('✅ Finalization query successful:', finalRes.rowCount, 'rows');
    } catch (err) {
      console.log('❌ Finalization query failed:', err.message);
    }
    
    console.log('6. Testing INSERT queries...');
    const readingId = '123e4567-e89b-12d3-a456-426614174001';
    const stationId = 'e3d3fbdb-9a74-44f7-b03a-f1cc46e643fe';
    
    try {
      // Test nozzle reading INSERT
      console.log('6a. Testing nozzle reading INSERT...');
      const insertRes = await pool.query(
        'INSERT INTO public.nozzle_readings (id, tenant_id, nozzle_id, reading, recorded_at, payment_method, status, updated_at) VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,NOW()) RETURNING id',
        [readingId, tenantId, nozzleId, 500.0, new Date(), 'cash', 'active']
      );
      console.log('✅ Nozzle reading INSERT successful');
      
      // Clean up
      await pool.query('DELETE FROM public.nozzle_readings WHERE id = $1::uuid', [readingId]);
      
    } catch (err) {
      console.log('❌ Nozzle reading INSERT failed:', err.message);
    }
    
    try {
      // Test sales INSERT
      console.log('6b. Testing sales INSERT...');
      const salesId = '123e4567-e89b-12d3-a456-426614174002';
      const salesRes = await pool.query(
        'INSERT INTO public.sales (id, tenant_id, nozzle_id, reading_id, station_id, volume, fuel_type, fuel_price, amount, payment_method, creditor_id, created_by, recorded_at, updated_at) VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,$9,$10,$11::uuid,$12::uuid,$13,NOW()) RETURNING id',
        [salesId, tenantId, nozzleId, readingId, stationId, 10.0, 'diesel', 45.0, 450.0, 'cash', null, userId, new Date()]
      );
      console.log('✅ Sales INSERT successful');
      
      // Clean up
      await pool.query('DELETE FROM public.sales WHERE id = $1::uuid', [salesId]);
      
    } catch (err) {
      console.log('❌ Sales INSERT failed:', err.message);
    }
    
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await pool.end();
  }
}

testUUIDIssue();
