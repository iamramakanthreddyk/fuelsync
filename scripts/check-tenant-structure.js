const { Pool } = require('pg');

async function checkTenantStructure() {
  require('dotenv').config();
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fuelsync_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Check tenants table
    console.log('=== TENANTS TABLE ===');
    const tenants = await client.query('SELECT id, name, schema_name FROM public.tenants ORDER BY created_at');
    tenants.rows.forEach(tenant => {
      console.log(`ID: ${tenant.id}, Name: ${tenant.name}, Schema: ${tenant.schema_name}`);
    });
    
    // Check production_tenant users table structure
    console.log('\n=== PRODUCTION_TENANT USERS TABLE STRUCTURE ===');
    try {
      const userTableInfo = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'production_tenant' AND table_name = 'users'
        ORDER BY ordinal_position
      `);
      userTableInfo.rows.forEach(col => {
        console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } catch (err) {
      console.log('Error checking users table:', err.message);
    }
    
    // Check stations table structure
    console.log('\n=== PRODUCTION_TENANT STATIONS TABLE STRUCTURE ===');
    try {
      const stationTableInfo = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'production_tenant' AND table_name = 'stations'
        ORDER BY ordinal_position
      `);
      stationTableInfo.rows.forEach(col => {
        console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } catch (err) {
      console.log('Error checking stations table:', err.message);
    }
    
    client.release();
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkTenantStructure().catch(console.error);