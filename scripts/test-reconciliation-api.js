const { Pool } = require('pg');
require('dotenv').config();

async function testReconciliationAPI() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🧪 Testing reconciliation API...\n');

    const tenantId = '681ac774-7a8f-428c-a008-2ac9aca76fc0';
    const stationId = 'b4f2399d-8bdb-42d0-9c18-591351f2fc66';
    const date = '2025-08-03';

    console.log(`📋 Test parameters:`);
    console.log(`  Tenant: ${tenantId}`);
    console.log(`  Station: ${stationId}`);
    console.log(`  Date: ${date}\n`);

    // Test system calculated sales
    console.log('💰 Testing system calculated sales...');
    const salesQuery = `
      SELECT
        s.fuel_type,
        s.payment_method,
        SUM(s.volume) as total_volume,
        SUM(s.amount) as total_amount
      FROM sales s
      WHERE s.tenant_id = $1
        AND s.station_id = $2
        AND DATE(s.recorded_at) = $3::date
        AND s.status != 'voided'
      GROUP BY s.fuel_type, s.payment_method
      ORDER BY s.fuel_type, s.payment_method
    `;

    const salesResult = await pool.query(salesQuery, [tenantId, stationId, date]);
    console.log(`Found ${salesResult.rows.length} sales records:`);
    salesResult.rows.forEach(row => {
      console.log(`  ${row.fuel_type} ${row.payment_method}: ${row.total_volume}L = ₹${row.total_amount}`);
    });

    // Test user entered cash
    console.log('\n💵 Testing user entered cash...');
    const cashQuery = `
      SELECT
        COALESCE(SUM(cash_collected), 0) as cash_collected,
        COALESCE(SUM(card_collected), 0) as card_collected,
        COALESCE(SUM(upi_collected), 0) as upi_collected
      FROM cash_reports
      WHERE tenant_id = $1
        AND station_id = $2
        AND date = $3::date
    `;

    const cashResult = await pool.query(cashQuery, [tenantId, stationId, date]);
    const cashRow = cashResult.rows[0];
    console.log(`Cash collected: ₹${cashRow.cash_collected}`);
    console.log(`Card collected: ₹${cashRow.card_collected}`);
    console.log(`UPI collected: ₹${cashRow.upi_collected}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testReconciliationAPI();