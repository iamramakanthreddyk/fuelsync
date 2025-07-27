const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
  const pool = new Pool({
    user: process.env.DB_USER || 'fuelsync',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'fuelsync_hub',
    password: process.env.DB_PASSWORD || 'fuelsync123',
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  console.log('Connecting to database:', {
    user: pool.options.user,
    host: pool.options.host,
    database: pool.options.database,
    port: pool.options.port
  });

  try {
    console.log('🔄 Resetting database...');
    
    // Drop all tables
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('GRANT ALL ON SCHEMA public TO fuelsync');
    await pool.query('GRANT ALL ON SCHEMA public TO public');
    
    console.log('✅ Database reset complete');
    
    // Run migrations in order
    const migrations = [
      '001_initial_schema.sql',
      '002_tenant_schema.sql', 
      '003_unified_schema.sql'
    ];
    
    for (const migration of migrations) {
      const filePath = path.join(__dirname, '..', 'migrations', 'schema', migration);
      if (fs.existsSync(filePath)) {
        console.log(`🔄 Running ${migration}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await pool.query(sql);
        console.log(`✅ ${migration} completed`);
      } else {
        console.log(`⚠️  ${migration} not found, skipping`);
      }
    }
    
    // Add daily closure columns
    const closurePath = path.join(__dirname, '..', 'migrations', 'simple_daily_closure.sql');
    if (fs.existsSync(closurePath)) {
      console.log('🔄 Adding daily closure columns...');
      const sql = fs.readFileSync(closurePath, 'utf8');
      await pool.query(sql);
      console.log('✅ Daily closure setup complete');
    }
    
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();