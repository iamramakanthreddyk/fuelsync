const { Pool } = require('pg');
require('dotenv').config();

async function testReconciliationEndpoint() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🧪 Testing reconciliation endpoint directly...\n');

    const tenantId = '681ac774-7a8f-428c-a008-2ac9aca76fc0';
    const stationId = 'b4f2399d-8bdb-42d0-9c18-591351f2fc66';
    const date = '2025-08-03';

    // Import the service function directly
    const { generateReconciliationSummary } = require('../dist/services/reconciliation.service');
    
    console.log(`📋 Test parameters:`);
    console.log(`  Tenant: ${tenantId}`);
    console.log(`  Station: ${stationId}`);
    console.log(`  Date: ${date}\n`);

    const summary = await generateReconciliationSummary(pool, tenantId, stationId, date);
    
    console.log('📊 Reconciliation Summary:');
    console.log(JSON.stringify(summary, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testReconciliationEndpoint();