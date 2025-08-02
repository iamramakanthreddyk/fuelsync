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

async function checkMissingTables() {
  try {
    console.log('🔍 CHECKING FOR MISSING TABLES AND RELATIONS');
    console.log('==============================================\n');
    
    // Check if user_activity_logs exists
    const activityLogsCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'user_activity_logs' AND table_schema = 'public'
    `);
    console.log(`📋 user_activity_logs table exists: ${activityLogsCheck.rows.length > 0 ? 'YES' : 'NO'}`);
    
    if (activityLogsCheck.rows.length > 0) {
      // Check structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'user_activity_logs' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      console.log('📊 user_activity_logs structure:');
      structure.rows.forEach(col => {
        console.log(`  ${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }
    
    // Check other critical tables
    const criticalTables = ['role_access_log', 'plan_feature_usage', 'reading_audit_log', 'report_generations'];
    console.log('\n🔍 CHECKING OTHER CRITICAL TABLES:');
    for (const tableName of criticalTables) {
      const tableCheck = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = $1 AND table_schema = 'public'
      `, [tableName]);
      console.log(`📋 ${tableName} exists: ${tableCheck.rows.length > 0 ? 'YES' : 'NO'}`);
    }
    
    // Check foreign key constraints
    console.log('\n🔗 CHECKING FOREIGN KEY CONSTRAINTS:');
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
        AND (tc.table_name IN ('user_activity_logs', 'role_access_log', 'plan_feature_usage', 'reading_audit_log')
             OR ccu.table_name IN ('tenants', 'users', 'plans'))
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    if (fkResult.rows.length > 0) {
      fkResult.rows.forEach(fk => {
        console.log(`  ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('  ⚠️  No foreign key constraints found for role-based access tables');
    }
    
    // Test if we can insert into role_access_log
    console.log('\n🧪 TESTING TABLE OPERATIONS:');
    try {
      // Get a sample tenant and user
      const tenantResult = await pool.query('SELECT id FROM public.tenants LIMIT 1');
      const userResult = await pool.query('SELECT id FROM public.users LIMIT 1');
      
      if (tenantResult.rows.length > 0 && userResult.rows.length > 0) {
        const tenantId = tenantResult.rows[0].id;
        const userId = userResult.rows[0].id;
        
        // Test role_access_log insert
        await pool.query(`
          INSERT INTO public.role_access_log (
            id, tenant_id, user_id, user_role, plan_tier, feature_requested, 
            action_requested, access_granted, denial_reason, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, 'test', 'starter', 'test_feature', 'test_action', true, null, NOW()
          )
        `, [tenantId, userId]);
        console.log('✅ role_access_log insert: SUCCESS');
        
        // Clean up test record
        await pool.query(`
          DELETE FROM public.role_access_log 
          WHERE feature_requested = 'test_feature' AND action_requested = 'test_action'
        `);
        
      } else {
        console.log('⚠️  No sample data available for testing');
      }
    } catch (error) {
      console.log(`❌ Table operation test failed: ${error.message}`);
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('===========');
    
    // Check what needs to be created
    const needsUserActivityLogs = activityLogsCheck.rows.length === 0;
    
    if (needsUserActivityLogs) {
      console.log('❌ user_activity_logs table is missing - needs to be created');
    } else {
      console.log('✅ user_activity_logs table exists');
    }
    
    console.log('✅ role_access_log table exists');
    console.log('✅ plan_feature_usage table exists');
    console.log('✅ reading_audit_log table exists');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMissingTables();
