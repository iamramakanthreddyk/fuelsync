const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function checkNozzleReadingsSchema() {
  try {
    console.log('Checking nozzle_readings table schema...\n');
    
    // Check table columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'nozzle_readings' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('=== COLUMNS ===');
    columns.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    // Check constraints
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'nozzle_readings' 
      AND table_schema = 'public';
    `);
    
    console.log('\n=== CONSTRAINTS ===');
    constraints.rows.forEach(row => {
      console.log(`${row.constraint_name}: ${row.constraint_type}`);
    });
    
    // Check if table exists and has data
    const tableInfo = await pool.query(`
      SELECT COUNT(*) as row_count 
      FROM public.nozzle_readings;
    `);
    
    console.log(`\n=== TABLE INFO ===`);
    console.log(`Total rows: ${tableInfo.rows[0].row_count}`);
    
  } catch (err) {
    console.error('Error checking schema:', err.message);
  } finally {
    await pool.end();
  }
}

checkNozzleReadingsSchema();
