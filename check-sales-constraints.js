const { Pool } = require('pg');

async function checkSalesConstraints() {
  const pool = new Pool({
    host: 'fuelsync-server.postgres.database.azure.com',
    user: 'fueladmin',
    password: 'Th1nkpad!2304',
    database: 'fuelsync_db',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking sales table constraints...');
    
    // Check all constraints on sales table
    const constraintsResult = await pool.query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = (
        SELECT oid FROM pg_class 
        WHERE relname = 'sales' 
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      )
      ORDER BY conname;
    `);
    
    console.log(`✅ Found ${constraintsResult.rowCount} constraints on sales table:`);
    constraintsResult.rows.forEach(row => {
      console.log(`- ${row.constraint_name} (${row.constraint_type}): ${row.constraint_definition}`);
    });
    
    // Check sales table column info
    console.log('\n🔍 Checking sales table columns...');
    const columnsResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'sales'
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log(`✅ Sales table columns:`);
    columnsResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (${row.udt_name}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    // Check what values are currently in the status column
    console.log('\n🔍 Checking existing status values in sales table...');
    const statusResult = await pool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM public.sales
      GROUP BY status
      ORDER BY count DESC;
    `);
    
    if (statusResult.rowCount > 0) {
      console.log(`✅ Existing status values:`);
      statusResult.rows.forEach(row => {
        console.log(`- "${row.status}": ${row.count} records`);
      });
    } else {
      console.log('ℹ️ No existing records in sales table');
    }
    
    // Try to find the specific check constraint definition
    console.log('\n🔍 Looking for chk_sales_status constraint details...');
    const checkConstraintResult = await pool.query(`
      SELECT 
        conname,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'chk_sales_status'
        AND conrelid = (
          SELECT oid FROM pg_class 
          WHERE relname = 'sales' 
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        );
    `);
    
    if (checkConstraintResult.rowCount > 0) {
      console.log(`✅ Found chk_sales_status constraint:`);
      console.log(`Definition: ${checkConstraintResult.rows[0].definition}`);
    } else {
      console.log('❌ chk_sales_status constraint not found');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  } finally {
    await pool.end();
  }
}

checkSalesConstraints();
