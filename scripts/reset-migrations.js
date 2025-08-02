/**
 * @file reset-migrations.js
 * @description Reset migration state to allow re-running migrations after fixing pgcrypto issue
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

async function resetMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Resetting migration state...');
    
    // Check if schema_migrations table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      )
    `);
    
    if (tableExists.rows[0].exists) {
      // Clear failed migration records (specifically 001 that failed due to pgcrypto)
      const result = await client.query(`
        DELETE FROM public.schema_migrations 
        WHERE version = '001'
      `);
      
      if (result.rowCount > 0) {
        console.log('✅ Removed failed migration 001 record');
      } else {
        console.log('ℹ️  No migration 001 record found to remove');
      }
      
      // Show current migration status
      const migrations = await client.query(`
        SELECT version, description, executed_at 
        FROM public.schema_migrations 
        ORDER BY version
      `);
      
      console.log('\n📋 Current migration status:');
      if (migrations.rows.length === 0) {
        console.log('   No migrations applied yet');
      } else {
        migrations.rows.forEach(row => {
          console.log(`   ✅ ${row.version}: ${row.description}`);
        });
      }
    } else {
      console.log('ℹ️  schema_migrations table does not exist yet');
    }
    
    console.log('\n🎉 Migration state reset complete!');
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
  resetMigrations();
}

module.exports = { resetMigrations };
