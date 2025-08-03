const { Pool } = require('pg');
require('dotenv').config();

async function testCashReportFix() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🧪 Testing cash report fix...\n');

    // Get sample data
    const tenant = await pool.query('SELECT id FROM tenants LIMIT 1');
    const station = await pool.query('SELECT id FROM stations LIMIT 1');
    const user = await pool.query('SELECT id FROM users LIMIT 1');

    if (!tenant.rows[0] || !station.rows[0] || !user.rows[0]) {
      console.log('❌ Missing test data (tenant, station, or user)');
      return;
    }

    const tenantId = tenant.rows[0].id;
    const stationId = station.rows[0].id;
    const userId = user.rows[0].id;

    console.log(`📋 Test data:`);
    console.log(`  Tenant: ${tenantId}`);
    console.log(`  Station: ${stationId}`);
    console.log(`  User: ${userId}\n`);

    // Test cash report insertion with correct columns
    const cash = 1000;
    const card = 500;
    const upi = 300;
    const totalCollected = cash + card + upi;

    console.log(`💰 Test amounts:`);
    console.log(`  Cash: ${cash}`);
    console.log(`  Card: ${card}`);
    console.log(`  UPI: ${upi}`);
    console.log(`  Total: ${totalCollected}\n`);

    const result = await pool.query(`
      INSERT INTO public.cash_reports (
        id, tenant_id, station_id, user_id, date, shift,
        cash_collected, card_collected, upi_collected, total_collected,
        notes, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, CURRENT_DATE, 'morning', $4, $5, $6, $7, 'Test report', 'submitted', NOW(), NOW()
      )
      ON CONFLICT (tenant_id, station_id, user_id, date, shift)
      DO UPDATE SET
        cash_collected = EXCLUDED.cash_collected,
        card_collected = EXCLUDED.card_collected,
        upi_collected = EXCLUDED.upi_collected,
        total_collected = EXCLUDED.total_collected,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id, total_collected
    `, [tenantId, stationId, userId, cash, card, upi, totalCollected]);

    if (result.rows.length > 0) {
      console.log('✅ Cash report inserted successfully!');
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   Total: ${result.rows[0].total_collected}`);
    } else {
      console.log('❌ No rows returned from insert');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testCashReportFix();