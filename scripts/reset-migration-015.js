/**
 * @file reset-migration-015.js
 * @description Reset migration 015 specifically
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

async function resetMigration015() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Resetting migration 015...');
    
    // Remove migration 015 record
    const result = await client.query(`
      DELETE FROM public.schema_migrations 
      WHERE version = '015'
    `);
    
    if (result.rowCount > 0) {
      console.log('✅ Removed failed migration 015 record');
    } else {
      console.log('ℹ️  No migration 015 record found to remove');
    }
    
    console.log('🎉 Migration 015 reset complete!');
    console.log('Now you can run: npm run migrate:up');
    
  } catch (error) {
    console.error('💥 Reset failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the reset if this script is executed directly
if (require.main === module) {
  resetMigration015();
}

module.exports = { resetMigration015 };
