const { Pool } = require('pg');

async function checkUsers() {
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
    
    // Check admin users
    console.log('=== ADMIN USERS ===');
    const adminUsers = await client.query('SELECT id, email, role, created_at FROM public.admin_users ORDER BY created_at');
    if (adminUsers.rows.length === 0) {
      console.log('No admin users found');
    } else {
      adminUsers.rows.forEach(user => {
        console.log(`- ${user.email} (${user.role}) - ID: ${user.id}`);
      });
    }
    
    // Check tenant users in production_tenant schema
    console.log('\n=== PRODUCTION TENANT USERS ===');
    try {
      const tenantUsers = await client.query('SELECT id, email, role, created_at FROM production_tenant.users ORDER BY created_at');
      if (tenantUsers.rows.length === 0) {
        console.log('No users found in production_tenant schema');
      } else {
        tenantUsers.rows.forEach(user => {
          console.log(`- ${user.email} (${user.role}) - ID: ${user.id}`);
        });
      }
    } catch (err) {
      console.log('Error checking production_tenant users:', err.message);
    }
    
    client.release();
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkUsers().catch(console.error);