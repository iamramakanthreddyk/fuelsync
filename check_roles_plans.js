const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function checkRolesAndPlans() {
  try {
    console.log('=== CHECKING ROLES AND PLANS ===\n');
    
    // Check user roles
    const rolesResult = await pool.query('SELECT DISTINCT role FROM users ORDER BY role');
    console.log('📋 EXISTING USER ROLES:');
    rolesResult.rows.forEach(row => console.log('- ' + row.role));
    
    // Check plans
    const plansResult = await pool.query('SELECT id, name, max_stations, price_monthly FROM plans ORDER BY price_monthly');
    console.log('\n💰 EXISTING PLANS:');
    plansResult.rows.forEach(row => {
      console.log(`- ${row.name} (max_stations: ${row.max_stations}, price: $${row.price_monthly})`);
    });
    
    // Check users table structure
    const usersStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log('\n👤 USERS TABLE STRUCTURE:');
    usersStructure.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check reading_audit_log structure
    const auditStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'reading_audit_log' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log('\n📝 READING_AUDIT_LOG TABLE STRUCTURE:');
    auditStructure.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check if user_id exists in reading_audit_log
    const userIdCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'reading_audit_log' AND column_name = 'user_id' AND table_schema = 'public'
    `);
    console.log(`\n✅ reading_audit_log.user_id exists: ${userIdCheck.rows.length > 0 ? 'YES' : 'NO'}`);
    
    if (userIdCheck.rows.length === 0) {
      console.log('❌ ISSUE: reading_audit_log table missing user_id column - this is causing the void error!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRolesAndPlans();
