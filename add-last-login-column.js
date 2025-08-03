/**
 * @file add-last-login-column.js
 * @description Add last_login_at column to users and admin_users tables
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addLastLoginColumn() {
  console.log('🔧 ADDING LAST_LOGIN_AT COLUMNS');
  console.log('===============================\n');

  try {
    // 1. Add last_login_at to users table
    console.log('1. Adding last_login_at to users table...');
    await pool.query(`
      ALTER TABLE public.users 
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE
    `);
    console.log('✅ Added last_login_at to users table');

    // 2. Add last_login_at to admin_users table
    console.log('2. Adding last_login_at to admin_users table...');
    await pool.query(`
      ALTER TABLE public.admin_users 
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE
    `);
    console.log('✅ Added last_login_at to admin_users table');

    // 3. Update existing users with a default last_login_at (set to created_at)
    console.log('3. Setting default last_login_at for existing users...');
    const updateUsers = await pool.query(`
      UPDATE public.users 
      SET last_login_at = created_at 
      WHERE last_login_at IS NULL
    `);
    console.log(`✅ Updated ${updateUsers.rowCount} users with default last_login_at`);

    const updateAdmins = await pool.query(`
      UPDATE public.admin_users 
      SET last_login_at = created_at 
      WHERE last_login_at IS NULL
    `);
    console.log(`✅ Updated ${updateAdmins.rowCount} admin users with default last_login_at`);

    // 4. Verify the changes
    console.log('\n4. Verifying table structures...');
    
    const usersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_login_at'
    `);
    
    const adminColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'admin_users' AND column_name = 'last_login_at'
    `);

    if (usersColumns.rows.length > 0) {
      console.log(`✅ users.last_login_at: ${usersColumns.rows[0].data_type} (${usersColumns.rows[0].is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    }
    
    if (adminColumns.rows.length > 0) {
      console.log(`✅ admin_users.last_login_at: ${adminColumns.rows[0].data_type} (${adminColumns.rows[0].is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    }

    console.log('\n🎉 Successfully added last_login_at columns!');

  } catch (error) {
    console.error('❌ Error adding last_login_at columns:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
addLastLoginColumn();
