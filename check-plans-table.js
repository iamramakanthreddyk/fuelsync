const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkPlansTable() {
  try {
    console.log('📋 CHECKING PLANS TABLE STRUCTURE');
    console.log('==================================\n');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'plans' 
      ORDER BY ordinal_position
    `);

    console.log('Plans table columns:');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${col.column_default ? `default: ${col.column_default}` : ''}`);
    });

    // Try to create a test plan
    console.log('\n🧪 Testing plan creation...');
    const testPlan = {
      name: 'Debug Test Plan',
      maxStations: 2,
      maxPumpsPerStation: 6,
      maxNozzlesPerPump: 3,
      priceMonthly: 799,
      priceYearly: 7990,
      features: ['Basic Dashboard', 'Email Support']
    };

    const insertQuery = `
      INSERT INTO public.plans (name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, price_yearly, features)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const insertResult = await pool.query(insertQuery, [
      testPlan.name,
      testPlan.maxStations,
      testPlan.maxPumpsPerStation,
      testPlan.maxNozzlesPerPump,
      testPlan.priceMonthly,
      testPlan.priceYearly,
      JSON.stringify(testPlan.features)
    ]);

    console.log('✅ Plan creation successful!');
    console.log('Created plan:', insertResult.rows[0]);

    // Clean up - delete the test plan
    await pool.query('DELETE FROM public.plans WHERE name = $1', [testPlan.name]);
    console.log('🧹 Test plan cleaned up');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkPlansTable();
