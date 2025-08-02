/**
 * @file fix-reconciliation-schema.js
 * @description Quick fix script for reconciliation schema issues
 * Uses the same connection pattern as migrate.js
 */
const { Pool } = require('pg');

// Load environment variables
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not available, using environment variables');
}

// Database configuration - same as migrate.js
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fuelsync',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: { rejectUnauthorized: false }
});

async function fixReconciliationSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Fixing reconciliation schema issues...');
    
    await client.query('BEGIN');
    
    // 1. Add missing columns to cash_reports
    console.log('📝 Updating cash_reports table...');
    await client.query(`
      ALTER TABLE public.cash_reports 
      ADD COLUMN IF NOT EXISTS card_collected DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS upi_collected DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS total_collected DECIMAL(10,2) DEFAULT 0.00
    `);
    
    // 2. Add status column to nozzle_readings if missing
    console.log('📝 Updating nozzle_readings table...');
    await client.query(`
      ALTER TABLE public.nozzle_readings 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    `);
    
    // 3. Add creditor_id column to nozzle_readings if missing
    await client.query(`
      ALTER TABLE public.nozzle_readings 
      ADD COLUMN IF NOT EXISTS creditor_id UUID
    `);
    
    // 4. Add status column to sales if missing
    console.log('📝 Updating sales table...');
    await client.query(`
      ALTER TABLE public.sales 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
    `);
    
    // 5. Update existing records
    console.log('📝 Updating existing records...');
    await client.query(`
      UPDATE public.nozzle_readings SET status = 'active' WHERE status IS NULL
    `);
    
    await client.query(`
      UPDATE public.sales SET status = 'pending' WHERE status IS NULL
    `);
    
    // 6. Create indexes for performance
    console.log('📝 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nozzle_readings_status 
      ON public.nozzle_readings(status)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_status 
      ON public.sales(status)
    `);
    
    await client.query('COMMIT');
    console.log('✅ Schema fixes applied successfully!');
    
    // Test the fixes
    console.log('🧪 Testing schema fixes...');
    
    const testQueries = [
      'SELECT COUNT(*) FROM public.cash_reports',
      'SELECT COUNT(*) FROM public.nozzle_readings WHERE status IS NOT NULL',
      'SELECT COUNT(*) FROM public.sales WHERE status IS NOT NULL'
    ];
    
    for (const query of testQueries) {
      try {
        const result = await client.query(query);
        console.log(`✅ ${query}: ${result.rows[0].count} rows`);
      } catch (error) {
        console.log(`❌ ${query}: ${error.message}`);
      }
    }
    
    console.log('🎉 All schema fixes completed successfully!');
    console.log('');
    console.log('Now you can start your backend:');
    console.log('npm run dev');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Schema fix failed:', error.message);
    console.log('');
    console.log('Try running the migration instead:');
    console.log('npm run migrate:up');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixReconciliationSchema();
}

module.exports = { fixReconciliationSchema };
