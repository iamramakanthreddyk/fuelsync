const { Pool } = require('pg');
require('dotenv').config();

async function verifyCashReports() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Verifying cash_reports table...\n');

    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cash_reports'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('✅ cash_reports table exists');

      // Check table structure
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'cash_reports' 
        ORDER BY ordinal_position;
      `);

      console.log('\n📋 Table structure:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });

      // Check if there are any records
      const count = await pool.query('SELECT COUNT(*) FROM cash_reports');
      console.log(`\n📊 Records in table: ${count.rows[0].count}`);

      // Get a sample station ID for testing
      const stations = await pool.query('SELECT id, name FROM stations LIMIT 1');
      if (stations.rows.length > 0) {
        console.log(`\n🏪 Sample station for testing: ${stations.rows[0].name} (${stations.rows[0].id})`);
      }

    } else {
      console.log('❌ cash_reports table does not exist');
      console.log('💡 Run: node scripts/create-cash-reports-table.js');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyCashReports();