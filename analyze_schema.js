const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function analyzeSchema() {
  try {
    console.log('=== ANALYZING EXISTING DATABASE SCHEMA ===\n');
    
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 EXISTING TABLES:');
    console.log('==================');
    for (const row of tablesResult.rows) {
      console.log('- ' + row.table_name);
    }
    
    console.log('\n🔍 DETAILED TABLE ANALYSIS:');
    console.log('============================\n');
    
    // Analyze key tables for role-based access
    const keyTables = ['tenants', 'users', 'plans', 'reading_audit_log', 'user_activity_logs', 'role_access_log'];
    
    for (const tableName of keyTables) {
      console.log(`📊 TABLE: ${tableName.toUpperCase()}`);
      console.log('─'.repeat(50));
      
      try {
        const columnsResult = await pool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [tableName]);
        
        if (columnsResult.rows.length > 0) {
          columnsResult.rows.forEach(col => {
            console.log(`  ${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
          });
        } else {
          console.log('  ❌ TABLE DOES NOT EXIST');
        }
      } catch (error) {
        console.log(`  ❌ ERROR: ${error.message}`);
      }
      console.log('');
    }
    
    // Check for foreign key relationships
    console.log('🔗 FOREIGN KEY RELATIONSHIPS:');
    console.log('==============================');
    const fkResult = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    fkResult.rows.forEach(fk => {
      console.log(`  ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    // Check specific columns we need for role-based access
    console.log('\n🎯 ROLE-BASED ACCESS REQUIREMENTS:');
    console.log('===================================');
    
    // Check if users table has role column
    const userRoleCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role' AND table_schema = 'public'
    `);
    console.log(`✓ users.role exists: ${userRoleCheck.rows.length > 0 ? 'YES' : 'NO'}`);
    
    // Check if tenants table has plan_id column
    const tenantPlanCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'plan_id' AND table_schema = 'public'
    `);
    console.log(`✓ tenants.plan_id exists: ${tenantPlanCheck.rows.length > 0 ? 'YES' : 'NO'}`);
    
    // Check if plans table exists
    const plansTableCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'plans' AND table_schema = 'public'
    `);
    console.log(`✓ plans table exists: ${plansTableCheck.rows.length > 0 ? 'YES' : 'NO'}`);
    
    // Check if reading_audit_log has user_id column
    const auditUserCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'reading_audit_log' AND column_name = 'user_id' AND table_schema = 'public'
    `);
    console.log(`✓ reading_audit_log.user_id exists: ${auditUserCheck.rows.length > 0 ? 'YES' : 'NO'}`);
    
    console.log('\n📝 RECOMMENDATIONS:');
    console.log('===================');
    
    if (userRoleCheck.rows.length === 0) {
      console.log('❌ Need to add role column to users table');
    }
    
    if (tenantPlanCheck.rows.length === 0) {
      console.log('❌ Need to add plan_id column to tenants table');
    }
    
    if (plansTableCheck.rows.length === 0) {
      console.log('❌ Need to create plans table');
    }
    
    if (auditUserCheck.rows.length === 0) {
      console.log('❌ Need to add user_id column to reading_audit_log table');
    }
    
    console.log('\n✅ Schema analysis complete!');
    
  } catch (error) {
    console.error('Error analyzing schema:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeSchema();
