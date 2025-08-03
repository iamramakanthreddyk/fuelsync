/**
 * @file debug-tenant-dates.js
 * @description Debug tenant date fields to see what's in the database
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function debugTenantDates() {
  console.log('🔍 DEBUGGING TENANT DATE FIELDS');
  console.log('================================\n');

  try {
    // Check raw tenant data
    console.log('1. Raw tenant data:');
    const rawResult = await pool.query(`
      SELECT id, name, created_at, updated_at
      FROM public.tenants 
      ORDER BY created_at DESC
    `);
    
    console.log('Raw query result:');
    rawResult.rows.forEach((row, i) => {
      console.log(`   Tenant ${i + 1}: ${row.name}`);
      console.log(`     ID: ${row.id}`);
      console.log(`     created_at: ${row.created_at} (type: ${typeof row.created_at})`);
      console.log(`     updated_at: ${row.updated_at} (type: ${typeof row.updated_at})`);
      console.log('');
    });

    // Check the exact query used in SuperAdmin controller
    console.log('2. SuperAdmin controller query:');
    const controllerResult = await pool.query(`
      SELECT 
        t.id,
        t.name,
        t.status,
        t.created_at,
        p.name as plan_name,
        (SELECT MAX(updated_at) FROM public.users WHERE tenant_id = t.id::text) as last_activity
      FROM public.tenants t
      LEFT JOIN public.plans p ON t.plan_id = p.id
      ORDER BY t.created_at DESC
    `);
    
    console.log('Controller query result:');
    controllerResult.rows.forEach((row, i) => {
      console.log(`   Tenant ${i + 1}: ${row.name}`);
      console.log(`     created_at: ${row.created_at} (type: ${typeof row.created_at})`);
      console.log(`     last_activity: ${row.last_activity} (type: ${typeof row.last_activity})`);
      console.log('     created_at JSON:', JSON.stringify(row.created_at));
      console.log('     last_activity JSON:', JSON.stringify(row.last_activity));
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error debugging tenant dates:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugTenantDates();
